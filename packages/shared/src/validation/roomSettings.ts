import {
  DAY_DISCUSSION_SECONDS_MAX,
  DAY_DISCUSSION_SECONDS_MIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../constants/room";
import { OPTIONAL_ROLES, type OptionalRole } from "../constants/roles";
import { maxOptionalRolesForPlayerCount } from "../rules/roomConfigs";

export function clampDayDiscussionSeconds(value: number): number {
  if (Number.isNaN(value)) {
    return DAY_DISCUSSION_SECONDS_MIN;
  }
  return Math.min(DAY_DISCUSSION_SECONDS_MAX, Math.max(DAY_DISCUSSION_SECONDS_MIN, Math.round(value)));
}

export function isValidPlayerCount(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PLAYERS && value <= MAX_PLAYERS;
}

/**
 * Never trust the client's optional-role selection as-is: dedupes, drops anything not in
 * OPTIONAL_ROLES, and caps the count to what actually fits for the given player count (each
 * optional role swaps out one base villager slot).
 */
export function sanitizeOptionalRoles(value: unknown, playerCount: number): OptionalRole[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const known = new Set(OPTIONAL_ROLES as readonly string[]);
  const unique = [...new Set(value)].filter((role): role is OptionalRole => known.has(role as string));
  return unique.slice(0, maxOptionalRolesForPlayerCount(playerCount));
}
