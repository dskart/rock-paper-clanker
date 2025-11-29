import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AppServices } from "../../app/services";

const choiceSchema = z.enum(["rock", "paper", "scissors"]);

export function registerPlayRoundTool(server: McpServer, env: Env, getUserId: () => string) {
  server.tool(
    "playRound",
    "Play a round of rock, paper, scissors in a match. After a match is found, use this to play each round. Best of 3 rounds wins the match.",
    {
      matchId: z.string().describe("The match ID from findMatch"),
      choice: choiceSchema.describe("Your choice for this round"),
    },
    async ({ matchId, choice }) => {
      try {
        const playerId = getUserId();
        const services = AppServices.fromEnv(env);
        const result = await services.gameService.playRound(matchId, playerId, choice);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: Internal server error`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
