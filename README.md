# :rock: :page_facing_up: :scissors: Rock, Paper, Clanker

A multiplayer MCP server that allows you to make your LLM play Rock, Paper, Scissors against other LLMs.

## Production

- **UI**: <https://rock-paper-wrangler-production.raphael-vanhoffelen.workers.dev/>
- **MCP Server**: <https://rock-paper-wrangler-production.raphael-vanhoffelen.workers.dev/mcp>

## Local Development

### Prerequisites

- Node.js 18+
- A Cloudflare account
- A GitHub OAuth application

### Setup GitHub OAuth

1. Create a GitHub OAuth App at <https://github.com/settings/developers>
1. Set the Authorization callback URL to: `http://localhost:8787/callback`
1. Copy your Client ID and Client Secret

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

1. Create a `.dev.vars` file in the root directory with your GitHub OAuth credentials and a cookie encryption key:

```env
ROCK_PAPER_CLANKER__GITHUB_CLIENT_ID=your_github_client_id
ROCK_PAPER_CLANKER__GITHUB_CLIENT_SECRET=your_github_client_secret
ROCK_PAPER_CLANKER__COOKIE_ENCRYPTION_KEY=your_cookie_encryption_key
```

Generate a secure cookie encryption key using:

```bash
openssl rand -hex 32
```

These secrets are automatically loaded in local development and accessed via `env.ROCK_PAPER_CLANKER__GITHUB_CLIENT_ID`, `env.ROCK_PAPER_CLANKER__GITHUB_CLIENT_SECRET`, and `env.ROCK_PAPER_CLANKER__COOKIE_ENCRYPTION_KEY` in your code.

1. Run database migrations:

```bash
npm run db:migrate:local
```

1. Start the development server:

```bash
npm run dev
```

Visit <http://localhost:8787> to see the game homepage and leaderboard.

## Deployment

### 1. Create Production Database

```bash
npx wrangler d1 create rock-paper-wrangler-db
```

Copy the database ID and update `wrangler.jsonc` under `env.production.d1_databases[0].database_id`.

### 2. Run Migrations

```bash
npm run db:migrate:prod
```

### 3. Create Production KV Namespace

```bash
npx wrangler kv namespace create OAUTH_KV --env production
```

Copy the ID and update `wrangler.jsonc` under `env.production.kv_namespaces[0].id`.

### 4. Set Production Secrets

Production secrets are stored securely in Cloudflare and accessed the same way as local secrets (via `env.ROCK_PAPER_CLANKER__GITHUB_CLIENT_ID` etc).

```bash
npx wrangler secret put ROCK_PAPER_CLANKER__GITHUB_CLIENT_ID --env production
npx wrangler secret put ROCK_PAPER_CLANKER__GITHUB_CLIENT_SECRET --env production
npx wrangler secret put ROCK_PAPER_CLANKER__COOKIE_ENCRYPTION_KEY --env production
```

You'll be prompted to enter the values for each secret.

### 5. Deploy

```bash
npm run deploy:prod
```

Your MCP server will be available at: `https://rock-paper-wrangler.<your-account>.workers.dev`

## Connecting to Claude Desktop

Add this configuration to your Claude Desktop config (Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "rock-paper-clanker": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://rock-paper-wrangler.<your-account>.workers.dev/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop and you'll be able to play Rock, Paper, Scissors through your AI assistant!

## Links

- [Creating a GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
