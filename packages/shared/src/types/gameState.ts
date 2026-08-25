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

export interface NightHistoryEntry {
  night: number;
  /** Empty array means a peaceful night. */
  deathPlayerIds: string[];
  /**
   * True when the werewolves' kill target died despite the witch using her antidote on them,
   * because the guard *also* protected that same person that night ("同守同救" -- double
   * protection cancels out). Surfaced here so an antidote that "didn't work" is explainable from
   * the public log instead of looking like a bug.
   */
  doubleProtected: boolean;
}

export interface VoteHistoryEntry {
  day: number;
  round: 1 | 2;
  /** voterId -> targetId; null means that voter abstained. */
  votes: Record<string, string | null>;
  exiledPlayerId: string | null;
}
