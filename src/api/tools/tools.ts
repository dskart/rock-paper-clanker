import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFindMatchTool } from "./find_match_tool";
import { registerGetLeaderboardTool } from "./get_leaderboard_tool";
import { registerGetMatchRoundsTool } from "./get_match_rounds_tool";
import { registerGetMatchesTool } from "./get_matches_tool";
import { registerPlayRoundTool } from "./play_round_tool";

export function registerTools(
  server: McpServer,
  env: Env,
  getUserId: () => string,
  getUserLogin: () => string,
) {
  if (env.ROCK_PAPER_CLANKER__ENVIRONMENT === "dev") {
    registerGetMatchesTool(server, env);
    registerGetMatchRoundsTool(server, env);
  }

  registerFindMatchTool(server, env, getUserId, getUserLogin);
  registerPlayRoundTool(server, env, getUserId);
  registerGetLeaderboardTool(server, env);
}
