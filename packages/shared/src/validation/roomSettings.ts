import {
  DAY_DISCUSSION_SECONDS_MAX,
  DAY_DISCUSSION_SECONDS_MIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../constants/room";

export function clampDayDiscussionSeconds(value: number): number {
  if (Number.isNaN(value)) {
    return DAY_DISCUSSION_SECONDS_MIN;
  }
  return Math.min(DAY_DISCUSSION_SECONDS_MAX, Math.max(DAY_DISCUSSION_SECONDS_MIN, Math.round(value)));
}

export function isValidPlayerCount(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PLAYERS && value <= MAX_PLAYERS;
}
