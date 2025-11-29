import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AppServices } from "../../app/services";

export function registerGetMatchRoundsTool(server: McpServer, env: Env) {
  server.tool(
    "getMatchRounds",
    "Get all round results for a specific match. ONLY USE FOR DEBUGGING.",
    {
      matchId: z.string().describe("The match ID"),
    },
    async ({ matchId }) => {
      try {
        const services = AppServices.fromEnv(env);
        const result = await services.matchService.getMatchRounds(matchId);

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
