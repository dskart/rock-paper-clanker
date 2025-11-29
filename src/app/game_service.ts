import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { schema } from "../db";
import type { Choice, Match, Round, RoundChoice } from "../db/schema";
import { createBot, isBot } from "./bots/registry";

const GameServiceConfigSchema = z.object({
  ROUND_POLL_INTERVAL: z
    .string()
    .transform(Number)
    .pipe(z.number().min(100).max(5000))
    .default("1000"),

  ROUND_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(1).max(120)).default("30"),

  WINNING_SCORE: z.string().transform(Number).pipe(z.number().min(1).max(10)).default("2"),
});

export type GameServiceConfig = z.infer<typeof GameServiceConfigSchema>;

export function parseGameServiceConfig(env: Env): GameServiceConfig {
  const envRecord = env as unknown as Record<string, unknown>;
  return GameServiceConfigSchema.parse({
    ROUND_POLL_INTERVAL: envRecord.ROCK_PAPER_CLANKER__GAME_SERVICE__ROUND_POLL_INTERVAL,
    ROUND_MAX_ATTEMPTS: envRecord.ROCK_PAPER_CLANKER__GAME_SERVICE__ROUND_MAX_ATTEMPTS,
    WINNING_SCORE: envRecord.ROCK_PAPER_CLANKER__GAME_SERVICE__WINNING_SCORE,
  });
}

export interface PlayRoundResult {
  status: "complete";
  round: number;
  yourChoice: Choice;
  opponentChoice?: Choice;
  roundWinner: "you" | "opponent" | "tie";
  matchScore: { you: number; opponent: number };
  matchOver: boolean;
  matchWinner?: "you" | "opponent";
  message: string;
}

export class GameService {
  constructor(
    private config: GameServiceConfig,
    private db: DrizzleD1Database,
  ) {}

  async playRound(matchId: string, playerId: string, choice: Choice): Promise<PlayRoundResult> {
    const [match] = await this.db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new Error("Match not found");
    }

    if (playerId !== match.player1Id && playerId !== match.player2Id) {
      throw new Error("Player not in this match");
    }

    // If match is already completed, check if player already played the final round
    if (match.status === "completed") {
      return await this.getCompletedMatchResult(match, playerId);
    }

    const currentRound = await this.getCurrentRound(matchId);
    const opponentId = playerId === match.player1Id ? match.player2Id : match.player1Id;

    // Check if player already played this round
    const existingChoice = await this.db
      .select()
      .from(schema.roundChoices)
      .where(
        and(
          eq(schema.roundChoices.roundId, currentRound.id),
          eq(schema.roundChoices.playerId, playerId),
        ),
      )
      .limit(1);

    if (existingChoice.length > 0) {
      // Player already played, just wait for the result
      await this.waitForOpponent(opponentId, currentRound);
    } else {
      // Player hasn't played yet, set their choice
      await this.setPlayerChoice(currentRound.id, playerId, choice);
      await this.waitForOpponent(opponentId, currentRound);
    }

    const choices = await this.getRoundChoices(currentRound.id);
    const winnerId = await this.determineWinner(match, currentRound, choices);

    // Calculate current scores from all completed rounds
    const scores = await this.calculateScores(matchId, playerId, opponentId);
    const matchOver = this.isMatchOver(scores.you, scores.opponent);

    if (matchOver) {
      await this.db
        .update(schema.matches)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(eq(schema.matches.id, matchId), eq(schema.matches.status, "active")));
    }

    const opponentChoice = choices.find((c) => c.playerId === opponentId)?.choice;
    const opponentTimedOut = choices.length < 2;

    const roundWinner = winnerId === null ? "tie" : winnerId === playerId ? "you" : "opponent";

    const message = this.buildResultMessage(
      currentRound.roundNumber,
      opponentTimedOut,
      matchOver,
      scores.you,
      scores.opponent,
    );

    return {
      status: "complete",
      round: currentRound.roundNumber,
      yourChoice: choice,
      opponentChoice: opponentChoice ?? undefined,
      roundWinner,
      matchScore: scores,
      matchOver,
      matchWinner: matchOver ? (scores.you > scores.opponent ? "you" : "opponent") : undefined,
      message,
    };
  }

  private async getCompletedMatchResult(match: Match, playerId: string): Promise<PlayRoundResult> {
    // Get the last completed round
    const completedRounds = await this.db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.matchId, match.id))
      .orderBy(schema.rounds.roundNumber);

    if (completedRounds.length === 0) {
      throw new Error("Match is completed but has no rounds");
    }

    const lastRound = completedRounds[completedRounds.length - 1];
    const choices = await this.getRoundChoices(lastRound.id);
    const opponentId = playerId === match.player1Id ? match.player2Id : match.player1Id;

    const scores = await this.calculateScores(match.id, playerId, opponentId);

    const yourChoice = choices.find((c) => c.playerId === playerId)?.choice;
    const opponentChoice = choices.find((c) => c.playerId === opponentId)?.choice;

    // If player didn't play in the final round, they lost by default
    if (!yourChoice) {
      return {
        status: "complete",
        round: lastRound.roundNumber,
        yourChoice: "rock", // placeholder since they didn't play
        opponentChoice: opponentChoice ?? undefined,
        roundWinner: "opponent",
        matchScore: scores,
        matchOver: true,
        matchWinner: "opponent",
        message:
          "Match already completed. Your opponent finished the final round before you could play.",
      };
    }

    const opponentTimedOut = choices.length < 2;
    const message = this.buildResultMessage(
      lastRound.roundNumber,
      opponentTimedOut,
      true,
      scores.you,
      scores.opponent,
    );

    const roundWinner =
      lastRound.winnerId === null ? "tie" : lastRound.winnerId === playerId ? "you" : "opponent";

    return {
      status: "complete",
      round: lastRound.roundNumber,
      yourChoice,
      opponentChoice: opponentChoice ?? undefined,
      roundWinner,
      matchScore: scores,
      matchOver: true,
      matchWinner: scores.you > scores.opponent ? "you" : "opponent",
      message,
    };
  }

  private async calculateScores(
    matchId: string,
    playerId: string,
    opponentId: string,
  ): Promise<{ you: number; opponent: number }> {
    const completedRounds = await this.db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.matchId, matchId));

    let yourScore = 0;
    let opponentScore = 0;

    for (const round of completedRounds) {
      if (round.winnerId === playerId) {
        yourScore++;
      } else if (round.winnerId === opponentId) {
        opponentScore++;
      }
      // null winnerId means tie, no score change
    }

    return { you: yourScore, opponent: opponentScore };
  }

  private async getCurrentRound(matchId: string): Promise<Round> {
    const completedRounds = await this.db
      .select()
      .from(schema.rounds)
      .where(and(eq(schema.rounds.matchId, matchId), isNotNull(schema.rounds.completedAt)));

    const currentRoundNumber = completedRounds.length + 1;

    let [round] = await this.db
      .select()
      .from(schema.rounds)
      .where(
        and(eq(schema.rounds.matchId, matchId), eq(schema.rounds.roundNumber, currentRoundNumber)),
      )
      .limit(1);

    if (!round) {
      try {
        await this.db.insert(schema.rounds).values({
          matchId,
          roundNumber: currentRoundNumber,
          createdAt: new Date(),
        });
      } catch {}

      [round] = await this.db
        .select()
        .from(schema.rounds)
        .where(
          and(
            eq(schema.rounds.matchId, matchId),
            eq(schema.rounds.roundNumber, currentRoundNumber),
          ),
        )
        .limit(1);
    }
    return round;
  }

  private async getRoundChoices(roundId: string): Promise<RoundChoice[]> {
    return await this.db
      .select()
      .from(schema.roundChoices)
      .where(eq(schema.roundChoices.roundId, roundId));
  }

  private async waitForOpponent(opponentId: string, round: Round) {
    if (isBot(opponentId)) {
      const bot = createBot(opponentId);
      const botChoice = bot.getChoice();

      await this.setPlayerChoice(round.id, opponentId, botChoice);
    } else {
      const maxAttempts = this.config.ROUND_MAX_ATTEMPTS;
      const pollInterval = this.config.ROUND_POLL_INTERVAL;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const choices = await this.getRoundChoices(round.id);

        if (choices.length === 2) {
          break;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }
    }
  }

  private async determineWinner(
    match: Match,
    round: Round,
    choices: RoundChoice[],
  ): Promise<string | null> {
    if (round.completedAt) {
      return round.winnerId;
    }

    let winnerId: string | null;
    const player1Choice = choices.find((c) => c.playerId === match.player1Id);
    const player2Choice = choices.find((c) => c.playerId === match.player2Id);

    if (!player1Choice || !player2Choice) {
      if (!player1Choice && !player2Choice) {
        throw new Error("Both players didn't play within 30 seconds");
      }
      winnerId = player1Choice ? match.player1Id : match.player2Id;
    } else {
      const p1 = player1Choice.choice;
      const p2 = player2Choice.choice;

      if (p1 === p2) {
        winnerId = null; // tie
      } else {
        const wins: Record<Choice, Choice> = {
          rock: "scissors",
          paper: "rock",
          scissors: "paper",
        };

        winnerId = wins[p1] === p2 ? match.player1Id : match.player2Id;
      }
    }

    const result = await this.db
      .update(schema.rounds)
      .set({ winnerId, completedAt: new Date() })
      .where(and(eq(schema.rounds.id, round.id), isNull(schema.rounds.winnerId)));

    if (!result.success || result.meta.rows_written === 0) {
      const [updatedRound] = await this.db
        .select()
        .from(schema.rounds)
        .where(eq(schema.rounds.id, round.id))
        .limit(1);
      return updatedRound.winnerId;
    }

    return winnerId;
  }

  private async setPlayerChoice(roundId: string, playerId: string, choice: Choice) {
    try {
      await this.db.insert(schema.roundChoices).values({
        roundId,
        playerId,
        choice,
        createdAt: new Date(),
      });
    } catch {
      throw new Error("You already played this round");
    }
  }

  private isMatchOver(yourScore: number, opponentScore: number): boolean {
    return yourScore === this.config.WINNING_SCORE || opponentScore === this.config.WINNING_SCORE;
  }

  private buildResultMessage(
    roundNumber: number,
    opponentTimedOut: boolean,
    matchOver: boolean,
    yourScore: number,
    opponentScore: number,
  ): string {
    if (opponentTimedOut) {
      let message = "Opponent didn't play within 30 seconds. You win this round by default!\n";
      if (matchOver) {
        message += "🎉 You won the match!";
      } else {
        message += "Continue to next round.";
      }
      return message;
    }

    if (matchOver) {
      const youWon = yourScore > opponentScore;
      return youWon
        ? "🎉 Congratulations! You won the match!"
        : "😔 You lost the match. Better luck next time!";
    }

    return `Round ${roundNumber} complete! Continue to next round.`;
  }
}
