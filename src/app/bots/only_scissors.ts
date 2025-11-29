import type { Choice } from "../../db/schema";
import { Bot } from "./bot";

export const ONLY_SCISSORS_BOT_NAME = "only-scissors-bot";

export class OnlyScissorsBot extends Bot {
  name = ONLY_SCISSORS_BOT_NAME;

  getChoice(): Choice {
    return "scissors";
  }
}
