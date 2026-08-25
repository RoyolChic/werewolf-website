import type { GamePhase } from "@kill-wolf/shared";

const NIGHT = "/background/night-background.png";
const SEER = "/background/seer-background.png";
const WITCH = "/background/witch-background.png";
const DAYLIGHT = "/background/daylight-background.png";
const VOTE = "/background/vote-background.png";

/** Fallback backdrop for pages/states that have no GamePhase yet (home page, connecting, ...). */
export const DEFAULT_BACKGROUND_PATH = NIGHT;

/**
 * Same village, five different vantage points across the day/night cycle: the square at night,
 * the seer's den, the witch's cellar, the square at dawn, and the square at dusk with the
 * speaking podium for discussion/voting/exile.
 */
export const PHASE_BACKGROUND_PATH: Record<GamePhase, string> = {
  LOBBY: NIGHT,
  CARD_PICKING: NIGHT,
  ROLE_REVEAL: NIGHT,
  NIGHT_START: NIGHT,
  NIGHT_GUARD: NIGHT,
  NIGHT_WEREWOLF: NIGHT,
  NIGHT_SEER: SEER,
  NIGHT_WITCH: WITCH,
  DAY_ANNOUNCEMENT: DAYLIGHT,
  HUNTER_SHOOT: DAYLIGHT,
  DAY_DISCUSSION: VOTE,
  DAY_VOTE: VOTE,
  DAY_TIEBREAK_DISCUSSION: VOTE,
  DAY_EXILE_RESULT: VOTE,
  DAY_LAST_WORDS: VOTE,
  GAME_OVER: DAYLIGHT,
};
