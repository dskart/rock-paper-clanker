export interface LeaderboardEntry {
  playerId: string;
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
      WITH player_stats AS (
        SELECT
          player1_id AS playerId,
          SUM(CASE WHEN player1_score > player2_score THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN player1_score < player2_score THEN 1 ELSE 0 END) AS losses
        FROM matches
        WHERE status = 'completed'
        GROUP BY player1_id

        UNION ALL

        SELECT
          player2_id AS playerId,
          SUM(CASE WHEN player2_score > player1_score THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN player2_score < player1_score THEN 1 ELSE 0 END) AS losses
        FROM matches
        WHERE status = 'completed'
        GROUP BY player2_id
      ),
      aggregated AS (
        SELECT
          playerId,
          SUM(wins) AS wins,
          SUM(losses) AS losses,
          SUM(wins) + SUM(losses) AS totalGames
        FROM player_stats
        GROUP BY playerId
      )
      SELECT
        playerId,
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
