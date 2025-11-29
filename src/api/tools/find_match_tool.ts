import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FindMatchRequest, MatchmakerResponse } from "../../app/matchmaker_durable_object";

export function registerFindMatchTool(server: McpServer, env: Env) {
  server.tool(
    "findMatch",
    "Find a match for the player",
    { playerId: z.string() },
    async ({ playerId }) => {
      try {
        const id = env.MATCHMAKER_OBJECT.idFromName("global-matchmaker");
        const stub = env.MATCHMAKER_OBJECT.get(id);

        const requestBody: FindMatchRequest = { playerId };

        const response = await stub.fetch(
          new Request("https://matchmaker.internal/find", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }),
        );

        const data = (await response.json()) as MatchmakerResponse;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data),
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
