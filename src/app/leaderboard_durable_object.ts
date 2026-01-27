export interface LeaderboardEntry {
  playerLogin: string;
  currentStreak: number;
  totalWins: number;
  totalMatches: number;
}

interface CachedLeaderboard {
  data: LeaderboardEntry[];
  timestamp: number;
}

const CACHE_DURATION_MS = 30000;

export class LeaderboardDurableObject {
  private env: Env;
  private cachedLeaderboard: CachedLeaderboard | null = null;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(_request: Request): Promise<Response> {
    try {
      const now = Date.now();

      if (this.cachedLeaderboard && now - this.cachedLeaderboard.timestamp < CACHE_DURATION_MS) {
        return Response.json(this.cachedLeaderboard.data);
      }

      const leaderboard = await this.fetchLeaderboard();
      this.cachedLeaderboard = {
        data: leaderboard,
        timestamp: now,
      };

      return Response.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard error:", error);
      return Response.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
  }

  private async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const results = await this.env.DB.prepare(`
      WITH match_winners AS (
        -- Determine winner of each completed match
        SELECT
          m.id AS match_id,
          m.player1_id,
          m.player1_login,
          m.player2_id,
          m.player2_login,
          m.completed_at,
          CASE
            WHEN SUM(CASE WHEN r.winner_id = m.player1_id THEN 1 ELSE 0 END) >
                 SUM(CASE WHEN r.winner_id = m.player2_id THEN 1 ELSE 0 END)
            THEN m.player1_id
            ELSE m.player2_id
          END AS winner_id
        FROM matches m
        JOIN rounds r ON r.match_id = m.id
        WHERE m.status = 'completed' AND r.winner_id IS NOT NULL
        GROUP BY m.id, m.player1_id, m.player1_login, m.player2_id, m.player2_login, m.completed_at
      ),
      player_matches AS (
        -- Flatten to one row per player per match with win/loss indicator
        SELECT
          player1_login AS player_login,
          player1_id AS player_id,
          match_id,
          completed_at,
          CASE WHEN winner_id = player1_id THEN 1 ELSE 0 END AS is_win
        FROM match_winners

        UNION ALL

        SELECT
          player2_login AS player_login,
          player2_id AS player_id,
          match_id,
          completed_at,
          CASE WHEN winner_id = player2_id THEN 1 ELSE 0 END AS is_win
        FROM match_winners
      ),
      ranked_matches AS (
        -- Rank each player's matches from most recent
        SELECT
          player_login,
          player_id,
          match_id,
          completed_at,
          is_win,
          ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY completed_at DESC) AS match_rank
        FROM player_matches
      ),
      streak_breaker AS (
        -- Find the first loss (streak breaker) for each player
        SELECT
          player_id,
          MIN(match_rank) AS first_loss_rank
        FROM ranked_matches
        WHERE is_win = 0
        GROUP BY player_id
      ),
      player_streaks AS (
        -- Calculate current streak: count wins before first loss
        SELECT
          rm.player_login,
          rm.player_id,
          COUNT(CASE WHEN rm.is_win = 1 AND (sb.first_loss_rank IS NULL OR rm.match_rank < sb.first_loss_rank) THEN 1 END) AS current_streak,
          SUM(rm.is_win) AS total_wins,
          COUNT(*) AS total_matches
        FROM ranked_matches rm
        LEFT JOIN streak_breaker sb ON sb.player_id = rm.player_id
        GROUP BY rm.player_login, rm.player_id
      )
      SELECT
        player_login AS playerLogin,
        current_streak AS currentStreak,
        total_wins AS totalWins,
        total_matches AS totalMatches
      FROM player_streaks
      WHERE current_streak > 0
      ORDER BY current_streak DESC, total_matches ASC, total_wins DESC
      LIMIT 100
    `).all<LeaderboardEntry>();

    return results.results;
  }
}
