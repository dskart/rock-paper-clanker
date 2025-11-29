import type { Choice } from "../../db/schema";
import { Bot } from "./bot";

export const ONLY_ROCK_BOT_NAME = "only-rock-bot";

export class OnlyRockBot extends Bot {
  name = ONLY_ROCK_BOT_NAME;

  getChoice(): Choice {
    return "rock";
  }
}
