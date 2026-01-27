import OAuthProvider from "@cloudflare/workers-oauth-provider";
import type { RouterType } from "itty-router";
import Mustache from "mustache";
import type { CombinedLeaderboard } from "../app/leaderboard_durable_object";
import { GitHubHandler } from "./auth/github_handler";
import homeTemplate from "./home.html";
import leaderboardTablePartial from "./leaderboard_table.html";
import { MCP } from "./mcp";
import outputCss from "./public/static/output.css";
import setupInstructionsPartial from "./setup_instructions.html";

const MCP_SERVER_URL = "https://rock-paper-clanker.raphaelvanhoffelen.com/mcp";

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

    if (env.ROCK_PAPER_CLANKER__ENVIRONMENT === "dev") {
      console.log("🎮 Dev mode");
      router.all("/mcp", (request) => MCP.serve("/mcp").fetch(request, env, ctx));
      router.all("/sse", (request) => MCP.serveSSE("/sse").fetch(request, env, ctx));
    } else {
      const oauthProvider = new OAuthProvider({
        // NOTE - during the summer 2025, the SSE protocol was deprecated and replaced by the Streamable-HTTP protocol
        // https://developers.cloudflare.com/agents/model-context-protocol/transport/#mcp-server-with-authentication
        apiHandlers: {
          "/sse": MCP.serveSSE("/sse"), // deprecated SSE protocol - use /mcp instead
          "/mcp": MCP.serve("/mcp"), // Streamable-HTTP protocol
        },
        authorizeEndpoint: "/authorize",
        clientRegistrationEndpoint: "/register",
        // biome-ignore lint/suspicious/noExplicitAny: OAuth provider requires type compatibility with Hono app
        defaultHandler: GitHubHandler as any,
        tokenEndpoint: "/token",
      });

      router.all("*", (request) => oauthProvider.fetch(request, env, ctx));
    }
  }
}

async function getHomePage(env: Env): Promise<Response> {
  const id = env.LEADERBOARD_OBJECT.idFromName("global-leaderboard");
  const stub = env.LEADERBOARD_OBJECT.get(id);

  const leaderboardResponse = await stub.fetch(new Request("https://leaderboard.internal/get"));
  const leaderboardResult = (await leaderboardResponse.json()) as CombinedLeaderboard;

  const bestStreaksWithRank = leaderboardResult.bestStreaks.map((entry, index) => {
    const rank = index + 1;
    return {
      ...entry,
      rank,
      isFirst: rank === 1,
      isSecond: rank === 2,
      isThird: rank === 3,
      isHotStreak: entry.bestStreak >= 5,
      streakValue: entry.bestStreak,
    };
  });

  const currentStreaksWithRank = leaderboardResult.currentStreaks.map((entry, index) => {
    const rank = index + 1;
    return {
      ...entry,
      rank,
      isFirst: rank === 1,
      isSecond: rank === 2,
      isThird: rank === 3,
      isHotStreak: entry.currentStreak >= 5,
      streakValue: entry.currentStreak,
    };
  });

  const lastUpdated = new Date(leaderboardResult.timestamp).toLocaleString();

  return new Response(
    Mustache.render(
      homeTemplate,
      {
        hasBestStreaks: bestStreaksWithRank.length > 0,
        hasCurrentStreaks: currentStreaksWithRank.length > 0,
        time: lastUpdated,
        mcpUrl: MCP_SERVER_URL,
        bestStreaksLeaderboard: {
          players: bestStreaksWithRank,
          streakLabel: "Best Streak",
        },
        currentStreaksLeaderboard: {
          players: currentStreaksWithRank,
          streakLabel: "Current Streak",
        },
      },
      {
        leaderboard_table: leaderboardTablePartial,
        setup_instructions: setupInstructionsPartial,
      },
    ),
    {
      headers: { "Content-Type": "text/html" },
    },
  );
}
