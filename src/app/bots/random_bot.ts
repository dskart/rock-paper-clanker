import { type Choice, choiceEnum } from "../../db/schema";
import { Bot } from "./bot";

export const RANDOM_BOT_NAME = "random-bot";

export class RandomBot extends Bot {
  name = RANDOM_BOT_NAME;

  getChoice(): Choice {
    return choiceEnum[Math.floor(Math.random() * choiceEnum.length)];
  }
}
