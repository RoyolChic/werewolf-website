import type { GamePhase } from "../types/phase";

export const ROOM_ID_LENGTH = 7;
export const ROOM_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 12;

export const DAY_DISCUSSION_SECONDS_MIN = 60;
export const DAY_DISCUSSION_SECONDS_MAX = 180;
export const DAY_DISCUSSION_SECONDS_DEFAULT = 120;

/** Default countdown for a night-role action (guard, seer, witch, hunter's shoot). */
export const NIGHT_ACTION_SECONDS = 20;
/** Werewolves get longer to discuss and agree on a kill target than other night roles. */
export const NIGHT_ACTION_SECONDS_WEREWOLF = 30;

export function getNightActionSeconds(phase: GamePhase): number {
  return phase === "NIGHT_WEREWOLF" ? NIGHT_ACTION_SECONDS_WEREWOLF : NIGHT_ACTION_SECONDS;
}

/** How long an exiled (or otherwise day-time removed) player gets to speak their last words before night falls. */
export const LAST_WORDS_SECONDS = 120;

export const PLAYER_NAME_MIN_LENGTH = 1;
export const PLAYER_NAME_MAX_LENGTH = 16;

export const GAME_OVER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ACTIVE_ROOM_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const IDLE_SWEEP_INTERVAL_MS = 60 * 1000;
