import type { Choice } from "../../db/schema";

export abstract class Bot {
  abstract name: string;
  abstract getChoice(): Choice;
}
