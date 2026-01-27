export interface LeaderboardEntry {
  playerLogin: string;
  bestStreak: number;
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
        -- Order each player's matches chronologically
        SELECT
          player_login,
          player_id,
          match_id,
          completed_at,
          is_win,
          ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY completed_at ASC) AS match_rank
        FROM player_matches
      ),
      streak_groups AS (
        -- Create groups: each loss increments the group counter
        -- All consecutive wins share the same group_id
        SELECT
          player_login,
          player_id,
          is_win,
          match_rank,
          SUM(CASE WHEN is_win = 0 THEN 1 ELSE 0 END) OVER (
            PARTITION BY player_id
            ORDER BY match_rank
          ) AS streak_group_id
        FROM ranked_matches
      ),
      streak_lengths AS (
        -- Count consecutive wins in each group
        SELECT
          player_id,
          streak_group_id,
          SUM(is_win) AS streak_length
        FROM streak_groups
        GROUP BY player_id, streak_group_id
      ),
      best_streaks AS (
        -- Find the longest streak for each player
        SELECT
          player_id,
          MAX(streak_length) AS best_streak
        FROM streak_lengths
        GROUP BY player_id
      ),
      player_stats AS (
        -- Calculate total stats for each player
        SELECT
          player_login,
          player_id,
          SUM(is_win) AS total_wins,
          COUNT(*) AS total_matches
        FROM ranked_matches
        GROUP BY player_login, player_id
      )
      SELECT
        ps.player_login AS playerLogin,
        COALESCE(bs.best_streak, 0) AS bestStreak,
        ps.total_wins AS totalWins,
        ps.total_matches AS totalMatches
      FROM player_stats ps
      LEFT JOIN best_streaks bs ON bs.player_id = ps.player_id
      WHERE COALESCE(bs.best_streak, 0) > 0
      ORDER BY bestStreak DESC, total_matches ASC, total_wins DESC
      LIMIT 100
    `).all<LeaderboardEntry>();

    return results.results;
  }
}
