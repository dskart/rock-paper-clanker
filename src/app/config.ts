import { type GameServiceConfig, parseGameServiceConfig } from "./game_service";
import { type MatchServiceConfig, parseMatchServiceConfig } from "./match_service";
import { type MatchmakerConfig, parseMatchmakerConfig } from "./matchmaker_durable_object";

// App-wide Configuration
export interface AppConfig {
  matchService: MatchServiceConfig;
  gameService: GameServiceConfig;
  matchmaker: MatchmakerConfig;
}

export function parseAppConfig(env: Env): AppConfig {
  return {
    matchService: parseMatchServiceConfig(env),
    gameService: parseGameServiceConfig(env),
    matchmaker: parseMatchmakerConfig(env),
  };
}
