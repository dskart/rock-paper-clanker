import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "sqlite",
	dbCredentials: {
		url: "file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/rock-paper-wrangler-db.sqlite",
	},
});

