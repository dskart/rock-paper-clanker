import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AppServices } from "../../app/services";

export function registerGetMatchesTool(server: McpServer, env: Env) {
  server.registerTool(
    "getMatches",
    {
      description: "Get all matches. ONLY USE FOR DEBUGGING.",
    },
    async () => {
    try {
      const services = AppServices.fromEnv(env);
      const matches = await services.matchService.getMatches();

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No matches found.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(matches, null, 2),
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
  });
}
