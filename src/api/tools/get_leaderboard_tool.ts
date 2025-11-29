import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LeaderboardEntry } from "../../app/leaderboard_durable_object";

export function registerGetLeaderboardTool(server: McpServer, env: Env) {
  server.tool(
    "getLeaderboard",
    "Get the current top 100 best match W/L ratio player IDs and their W/L ratios. Results are cached for 30 seconds.",
    {},
    async () => {
      try {
        const id = env.LEADERBOARD_OBJECT.idFromName("global-leaderboard");
        const stub = env.LEADERBOARD_OBJECT.get(id);

        const response = await stub.fetch(
          new Request("https://leaderboard.internal/get", {
            method: "GET",
          }),
        );

        const data = (await response.json()) as LeaderboardEntry[];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
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
