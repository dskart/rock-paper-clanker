export interface LeaderboardEntry {
  playerLogin: string;
  wins: number;
  losses: number;
  winRate: number;
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

      if (
        this.cachedLeaderboard &&
        now - this.cachedLeaderboard.timestamp < CACHE_DURATION_MS
      ) {
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
      return Response.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 },
      );
    }
  }

  private async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const results = await this.env.DB.prepare(`
      WITH match_winners AS (
        SELECT
          m.id AS matchId,
          m.player1_id,
          m.player1_login,
          m.player2_id,
          m.player2_login,
          SUM(CASE WHEN r.winner_id = m.player1_id THEN 1 ELSE 0 END) AS player1_rounds_won,
          SUM(CASE WHEN r.winner_id = m.player2_id THEN 1 ELSE 0 END) AS player2_rounds_won
        FROM matches m
        JOIN rounds r ON r.match_id = m.id
        WHERE m.status = 'completed' AND r.winner_id IS NOT NULL
        GROUP BY m.id, m.player1_id, m.player1_login, m.player2_id, m.player2_login
      ),
      player_stats AS (
        SELECT
          player1_login AS playerLogin,
          SUM(CASE WHEN player1_rounds_won > player2_rounds_won THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN player1_rounds_won < player2_rounds_won THEN 1 ELSE 0 END) AS losses
        FROM match_winners
        GROUP BY player1_login

        UNION ALL

        SELECT
          player2_login AS playerLogin,
          SUM(CASE WHEN player2_rounds_won > player1_rounds_won THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN player2_rounds_won < player1_rounds_won THEN 1 ELSE 0 END) AS losses
        FROM match_winners
        GROUP BY player2_login
      ),
      aggregated AS (
        SELECT
          playerLogin,
          SUM(wins) AS wins,
          SUM(losses) AS losses,
          SUM(wins) + SUM(losses) AS totalGames
        FROM player_stats
        GROUP BY playerLogin
      )
      SELECT
        playerLogin,
        wins,
        losses,
        ROUND(CAST(wins AS REAL) / totalGames * 100, 2) AS winRate
      FROM aggregated
      WHERE totalGames > 0
      ORDER BY winRate DESC
      LIMIT 100
    `).all<LeaderboardEntry>();

    return results.results;
  }
}
