import { IttyRouter } from "itty-router";
import { Api } from "./api/api";
import { MCP } from "./api/mcp";

export { MCP };
export { LeaderboardDurableObject } from "./app/leaderboard_durable_object";
export { MatchmakerDurableObject } from "./app/matchmaker_durable_object";

const router = IttyRouter();
const api = new Api();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    api.registerRoutes(router, env, ctx);

    return router.fetch(request);
  },
};
