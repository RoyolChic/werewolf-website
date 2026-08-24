export const GAME_PHASES = [
  "LOBBY",
  "CARD_PICKING",
  "ROLE_REVEAL",
  "NIGHT_START",
  "NIGHT_WEREWOLF",
  "NIGHT_SEER",
  "NIGHT_WITCH",
  "DAY_ANNOUNCEMENT",
  "DAY_DISCUSSION",
  "DAY_VOTE",
  "DAY_EXILE_RESULT",
  "GAME_OVER",
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];
