import { describe, expect, it } from "vitest";
import { BOT_NAMES, createBot, getRandomBotName, isBot } from "./registry";

describe("Bot Registry", () => {
  describe("BOT_NAMES", () => {
    it("should contain at least one bot", () => {
      expect(BOT_NAMES.length).toBeGreaterThan(0);
    });

    it("should contain RandomBot", () => {
      expect(BOT_NAMES).toContain("RandomBot");
    });
  });

  describe("createBot", () => {
    it("should create RandomBot", () => {
      const bot = createBot("RandomBot");
      expect(bot).toBeDefined();
      expect(bot.getChoice).toBeDefined();
    });

    it("should return different instances", () => {
      const bot1 = createBot("RandomBot");
      const bot2 = createBot("RandomBot");
      expect(bot1).not.toBe(bot2);
    });

    it("bot should return valid choices", () => {
      const bot = createBot("RandomBot");
      const choice = bot.getChoice();
      expect(["rock", "paper", "scissors"]).toContain(choice);
    });
  });

  describe("getRandomBotName", () => {
    it("should return a valid bot name", () => {
      const botName = getRandomBotName();
      expect(BOT_NAMES).toContain(botName);
    });

    it("should return RandomBot when it's the only bot", () => {
      // Since we only have one bot currently
      const botName = getRandomBotName();
      expect(botName).toBe("RandomBot");
    });
  });

  describe("isBot", () => {
    it("should return true for RandomBot", () => {
      expect(isBot("RandomBot")).toBe(true);
    });

    it("should return false for regular player IDs", () => {
      expect(isBot("player-123")).toBe(false);
      expect(isBot("uuid-here")).toBe(false);
      expect(isBot("12345")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isBot("")).toBe(false);
    });
  });
});
