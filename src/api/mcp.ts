import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { registerTools } from "./tools/tools";

type Props = {
  id: number;
  login: string;
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
    if (!this.props) {
      throw new Error("User ID is required");
    }

    const props = this.props;

    let getUserId = () => props.id.toString();
    if (this.env.ROCK_PAPER_CLANKER__ENVIRONMENT === "dev") {
      const sillyName = this.generateSillyName();
      getUserId = () => sillyName;
      console.debug("🎮 Dev mode using silly name:", sillyName);
    }

    registerTools(this.server, this.env, getUserId);
  }

  private generateSillyName(): string {
    const adjectives = [
      "silly",
      "dancing",
      "sleepy",
      "grumpy",
      "bouncy",
      "sneaky",
      "wacky",
      "fuzzy",
      "dizzy",
      "jolly",
      "quirky",
      "wobbly",
    ];
    const nouns = [
      "potato",
      "banana",
      "unicorn",
      "penguin",
      "taco",
      "dinosaur",
      "robot",
      "ninja",
      "pickle",
      "waffle",
      "noodle",
      "cactus",
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}`;
  }
}
