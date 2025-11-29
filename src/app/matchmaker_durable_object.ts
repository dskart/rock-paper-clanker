import { z } from "zod";
import { getDb, schema } from "../db";
import { getRandomBotName } from "./bots/registry";

const MatchmakerConfigSchema = z.object({
  TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(60000)).default("30000"),
});

export type MatchmakerConfig = z.infer<typeof MatchmakerConfigSchema>;

export function parseMatchmakerConfig(env: Env): MatchmakerConfig {
  const envRecord = env as unknown as Record<string, unknown>;
  return MatchmakerConfigSchema.parse({
    TIMEOUT: envRecord.MATCHMAKER__TIMEOUT,
  });
}

// Request schema
const FindMatchRequestSchema = z.object({
  playerId: z.string().min(1),
});

// Response schemas
const MatchedResponseSchema = z.object({
  status: z.literal("matched"),
  matchId: z.string(),
});

const TimeoutResponseSchema = z.object({
  status: z.literal("timeout"),
});

const ErrorResponseSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
});

export const MatchmakerResponseSchema = z.union([
  MatchedResponseSchema,
  TimeoutResponseSchema,
  ErrorResponseSchema,
]);

export type FindMatchRequest = z.infer<typeof FindMatchRequestSchema>;
export type MatchmakerResponse = z.infer<typeof MatchmakerResponseSchema>;

export class MatchmakerDurableObject {
  private env: Env;
  private config: MatchmakerConfig;
  private pendingPlayer: {
    playerId: string;
    timestamp: number;
    resolve: (matchId: string) => void;
  } | null = null;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
    this.config = parseMatchmakerConfig(env);
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const { playerId } = FindMatchRequestSchema.parse(body);
      return await this.findMatch(playerId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse: MatchmakerResponse = {
          status: "error",
          error: `Invalid request: ${error.errors.map((e) => e.message).join(", ")}`,
        };
        return Response.json(errorResponse, { status: 400 });
      }
      const errorResponse: MatchmakerResponse = {
        status: "error",
        error: "Failed to process request",
      };
      return Response.json(errorResponse, { status: 500 });
    }
  }

  private async findMatch(playerId: string): Promise<Response> {
    // Already waiting? Reject duplicate
    if (this.pendingPlayer?.playerId === playerId) {
      const errorResponse: MatchmakerResponse = {
        status: "error",
        error: "Already in queue",
      };
      return Response.json(errorResponse, { status: 400 });
    }

    // Someone waiting? Match them!
    if (this.pendingPlayer) {
      const opponentId = this.pendingPlayer.playerId;

      const matchId = await this.createMatch(playerId, opponentId);

      // Notify waiting player
      this.pendingPlayer.resolve(matchId);
      this.pendingPlayer = null;

      const matchedResponse: MatchmakerResponse = { status: "matched", matchId };
      return Response.json(matchedResponse);
    }

    // No one waiting - wait up to configured timeout
    return new Promise<Response>((resolve) => {
      const timeoutId = setTimeout(async () => {
        if (this.pendingPlayer?.playerId === playerId) {
          this.pendingPlayer = null;

          // Match with a random bot instead of timing out
          const botName = getRandomBotName();
          const matchId = await this.createMatch(playerId, botName);

          const matchedResponse: MatchmakerResponse = { status: "matched", matchId };
          resolve(Response.json(matchedResponse));
        } else {
          const timeoutResponse: MatchmakerResponse = { status: "timeout" };
          resolve(Response.json(timeoutResponse));
        }
      }, this.config.TIMEOUT);

      this.pendingPlayer = {
        playerId,
        timestamp: Date.now(),
        resolve: (matchId: string) => {
          clearTimeout(timeoutId);
          const matchedResponse: MatchmakerResponse = { status: "matched", matchId };
          resolve(Response.json(matchedResponse));
        },
      };
    });
  }

  private async createMatch(player1Id: string, player2Id: string): Promise<string> {
    const db = getDb(this.env.DB);

    const result = await db
      .insert(schema.matches)
      .values({
        player1Id: player1Id,
        player2Id: player2Id,
        status: "active",
        createdAt: new Date(),
      })
      .returning({ id: schema.matches.id });

    return result[0].id;
  }
}
