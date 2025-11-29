import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const matchStatusEnum = ["active", "completed"] as const;
export type MatchStatus = (typeof matchStatusEnum)[number];

export const choiceEnum = ["rock", "paper", "scissors"] as const;
export type Choice = (typeof choiceEnum)[number];

export const matches = sqliteTable("matches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  player1Id: text("player1_id").notNull(),
  player2Id: text("player2_id").notNull(),
  status: text("status", { enum: matchStatusEnum }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

export const rounds = sqliteTable("rounds", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id),
  roundNumber: integer("round_number").notNull(),
  winnerId: text("winner_id"), // null means tie, otherwise player ID
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;

export const roundChoices = sqliteTable(
  "round_choices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id),
    playerId: text("player_id").notNull(),
    choice: text("choice", { enum: choiceEnum }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("round_choices_round_player_idx").on(table.roundId, table.playerId)],
);

export type RoundChoice = typeof roundChoices.$inferSelect;
export type NewRoundChoice = typeof roundChoices.$inferInsert;
