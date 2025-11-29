import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { GoogleHandler } from "./auth/google_handler";
import { registerTools } from "./tools/tools";

type Props = {
  name: string;
  email: string;
  accessToken: string;
};

export class MCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Rock, Paper, Clanker",
    version: "1.0.0",
  });

  async init() {
    registerTools(this.server, this.env);
  }
}

export default new OAuthProvider({
  // NOTE - during the summer 2025, the SSE protocol was deprecated and replaced by the Streamable-HTTP protocol
  // https://developers.cloudflare.com/agents/model-context-protocol/transport/#mcp-server-with-authentication
  apiHandlers: {
    "/sse": MyMCP.serveSSE("/sse"), // deprecated SSE protocol - use /mcp instead
    "/mcp": MyMCP.serve("/mcp"), // Streamable-HTTP protocol
  },
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GoogleHandler as any,
  tokenEndpoint: "/token",
});
