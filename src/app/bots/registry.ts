import type { Bot } from "./bot";
import { ONLY_PAPER_BOT_NAME, OnlyPaperBot } from "./only_paper";
import { ONLY_ROCK_BOT_NAME, OnlyRockBot } from "./only_rock";
import { ONLY_SCISSORS_BOT_NAME, OnlyScissorsBot } from "./only_scissors";
import { RANDOM_BOT_NAME, RandomBot } from "./random_bot";

const BOTS: Record<string, () => Bot> = {
  [RANDOM_BOT_NAME]: () => new RandomBot(),
  [ONLY_ROCK_BOT_NAME]: () => new OnlyRockBot(),
  [ONLY_SCISSORS_BOT_NAME]: () => new OnlyScissorsBot(),
  [ONLY_PAPER_BOT_NAME]: () => new OnlyPaperBot(),
};

export const BOT_NAMES = Object.keys(BOTS);

export function createBot(name: string): Bot {
  const botFactory = BOTS[name];
  if (!botFactory) {
    throw new Error(`Unknown bot: ${name}`);
  }
  return botFactory();
}

export function getRandomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

export function isBot(playerId: string): boolean {
  return playerId in BOTS;
}
