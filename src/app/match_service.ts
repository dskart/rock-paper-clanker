import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { schema } from "../db";

// MatchService Configuration
const MatchServiceConfigSchema = z.object({});

export type MatchServiceConfig = z.infer<typeof MatchServiceConfigSchema>;

export function parseMatchServiceConfig(_env: Env): MatchServiceConfig {
  return MatchServiceConfigSchema.parse({});
}

export class MatchService {
  constructor(
    _config: MatchServiceConfig,
    private db: DrizzleD1Database,
  ) {}

  async getMatches() {
    const matches = await this.db.select().from(schema.matches);

    return matches;
  }

  async getMatchRounds(matchId: string) {
    const [match] = await this.db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new Error("Match not found");
    }

    const rounds = await this.db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.matchId, matchId))
      .orderBy(schema.rounds.roundNumber);

    return {
      match,
      rounds,
    };
  }
}
