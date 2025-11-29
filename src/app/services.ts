import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { type AppConfig, parseAppConfig } from "./config";
import { GameService } from "./game_service";
import { MatchService } from "./match_service";

export class AppServices {
  public readonly gameService: GameService;
  public readonly matchService: MatchService;

  constructor(
    public readonly config: AppConfig,
    public readonly db: DrizzleD1Database,
  ) {
    this.gameService = new GameService(config.gameService, db);
    this.matchService = new MatchService(config.matchService, db);
  }

  static fromEnv(env: Env): AppServices {
    const config = parseAppConfig(env);
    const db = drizzle(env.DB);

    return new AppServices(config, db);
  }
}
