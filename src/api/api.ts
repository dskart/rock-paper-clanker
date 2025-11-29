import type { RouterType } from "itty-router";
import Mustache from "mustache";
import type { LeaderboardEntry } from "../app/leaderboard_durable_object";
import homeTemplate from "./home.html";
import { MCP } from "./mcp";
import outputCss from "./public/static/output.css";

const STATIC_FILES: Record<string, { content: string; contentType: string }> = {
  "output.css": { content: outputCss, contentType: "text/css" },
};

export class Api {
  registerRoutes(router: RouterType, env: Env, ctx: ExecutionContext) {
    router.get("/", () => getHomePage(env));

    router.get("/static/:filename", (request) => {
      const filename = request.params?.filename;
      const file = STATIC_FILES[filename];

      if (!file) {
        return new Response("Not Found", { status: 404 });
      }

      return new Response(file.content, {
        headers: { "Content-Type": file.contentType },
      });
    });

    router.all("/mcp", (request) => MCP.serve("/mcp").fetch(request, env, ctx));
    router.all("/sse", (request) => MCP.serveSSE("/sse").fetch(request, env, ctx));

    router.all("*", () => new Response("Not Found", { status: 404 }));
  }
}

async function getHomePage(env: Env): Promise<Response> {
  const id = env.LEADERBOARD_OBJECT.idFromName("global-leaderboard");
  const stub = env.LEADERBOARD_OBJECT.get(id);

  const response = await stub.fetch(
    new Request("https://leaderboard.internal/get", {
      method: "GET",
    }),
  );

  const leaderboard = (await response.json()) as LeaderboardEntry[];
  const leaderboardWithRank = leaderboard.map((entry, index) => {
    const rank = index + 1;
    return {
      ...entry,
      rank,
      isFirst: rank === 1,
      isSecond: rank === 2,
      isThird: rank === 3,
    };
  });

  return new Response(
    Mustache.render(homeTemplate, {
      leaderboard: leaderboardWithRank,
      hasLeaderboard: leaderboardWithRank.length > 0,
      time: new Date().toLocaleString(),
    }),
    {
      headers: { "Content-Type": "text/html" },
    },
  );
}
