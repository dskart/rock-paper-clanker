import type { Choice } from "../../db/schema";
import { Bot } from "./bot";

export const ONLY_PAPER_BOT_NAME = "only-paper-bot";

export class OnlyPaperBot extends Bot {
  name = ONLY_PAPER_BOT_NAME;

  getChoice(): Choice {
    return "paper";
  }
}
