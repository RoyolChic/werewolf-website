import type { Faction } from "./role";

export interface ExileResult {
  round: 1 | 2;
  exiledPlayerId: string | null;
}

export interface WitchAvailability {
  hasAntidote: boolean;
  hasPoison: boolean;
}

export type Winner = Faction | null;
