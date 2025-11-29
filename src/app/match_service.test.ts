import { describe, expect, it, vi } from "vitest";
import { MatchService, parseMatchServiceConfig } from "./match_service";

describe("MatchService", () => {
  const config = parseMatchServiceConfig({} as Env);

  describe("getMatches", () => {
    it("should call db.select and return matches", async () => {
      const mockMatches = [
        { id: "1", player1Id: "a", player2Id: "b", status: "active" },
        { id: "2", player1Id: "c", player2Id: "d", status: "completed" },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue(mockMatches),
        }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
      } as any;

      const service = new MatchService(config, mockDb);
      const result = await service.getMatches();

      expect(result).toEqual(mockMatches);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no matches exist", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([]),
        }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
      } as any;

      const service = new MatchService(config, mockDb);
      const result = await service.getMatches();

      expect(result).toEqual([]);
    });
  });

  describe("getMatchRounds", () => {
    it("should throw error when match not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
      } as any;

      const service = new MatchService(config, mockDb);

      await expect(service.getMatchRounds("invalid-id")).rejects.toThrow("Match not found");
    });

    it("should return match and rounds when match exists", async () => {
      const mockMatch = {
        id: "1",
        player1Id: "a",
        player2Id: "b",
        status: "active",
      };
      const mockRounds = [{ id: "1", matchId: "1", roundNumber: 1, winnerId: "a" }];

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMatch]),
              orderBy: vi.fn().mockResolvedValue(mockRounds),
            }),
          }),
        })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
      } as any;

      const service = new MatchService(config, mockDb);
      const result = await service.getMatchRounds("1");

      expect(result.match).toEqual(mockMatch);
      expect(result.rounds).toEqual(mockRounds);
    });

    it("should return match with multiple rounds in order", async () => {
      const mockMatch = {
        id: "1",
        player1Id: "a",
        player2Id: "b",
        status: "completed",
      };
      const mockRounds = [
        { id: "1", matchId: "1", roundNumber: 1, winnerId: "a" },
        { id: "2", matchId: "1", roundNumber: 2, winnerId: "b" },
        { id: "3", matchId: "1", roundNumber: 3, winnerId: "a" },
      ];

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMatch]),
              orderBy: vi.fn().mockResolvedValue(mockRounds),
            }),
          }),
        })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock DB for testing
      } as any;

      const service = new MatchService(config, mockDb);
      const result = await service.getMatchRounds("1");

      expect(result.rounds).toHaveLength(3);
      expect(result.rounds[0].roundNumber).toBe(1);
      expect(result.rounds[1].roundNumber).toBe(2);
      expect(result.rounds[2].roundNumber).toBe(3);
    });
  });
});
