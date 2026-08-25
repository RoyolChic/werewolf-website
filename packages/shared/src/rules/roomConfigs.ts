import type { RoleCounts } from "../types/room";
import { OPTIONAL_ROLES, type OptionalRole } from "../constants/roles";

interface BaseRoleCounts {
  WEREWOLF: number;
  SEER: number;
  WITCH: number;
  VILLAGER: number;
}

const BASE_ROLE_COUNTS_BY_PLAYER_COUNT: Record<number, BaseRoleCounts> = {
  6: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 2 },
  7: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 3 },
  8: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 4 },
  9: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 4 },
  10: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 5 },
  11: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 6 },
  12: { WEREWOLF: 4, SEER: 1, WITCH: 1, VILLAGER: 6 },
};

export const SUPPORTED_PLAYER_COUNTS: number[] = Object.keys(BASE_ROLE_COUNTS_BY_PLAYER_COUNT).map(Number).sort((a, b) => a - b);

/** Kept for the room-setup UI: the base villager count is the ceiling on how many optional roles fit. */
export function getBaseVillagerCount(playerCount: number): number {
  return BASE_ROLE_COUNTS_BY_PLAYER_COUNT[playerCount]?.VILLAGER ?? 0;
}

export function maxOptionalRolesForPlayerCount(playerCount: number): number {
  return Math.min(OPTIONAL_ROLES.length, getBaseVillagerCount(playerCount));
}

/**
 * Each selected optional role swaps out one villager slot from the base count for the player
 * count. Silently drops roles once villager slots run out rather than going negative -- the
 * caller (room setup UI) should keep hosts from selecting more than fit in the first place, but
 * the server re-derives from this function too and must never trust the client's math.
 */
export function getRoleCountsForPlayerCount(playerCount: number, optionalRoles: OptionalRole[] = []): RoleCounts {
  const base = BASE_ROLE_COUNTS_BY_PLAYER_COUNT[playerCount];
  if (!base) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }

  const counts: RoleCounts = { ...base, HUNTER: 0, GUARD: 0, KNIGHT: 0 };
  const uniqueRoles = [...new Set(optionalRoles)].filter((role): role is OptionalRole =>
    (OPTIONAL_ROLES as readonly string[]).includes(role),
  );
  for (const role of uniqueRoles) {
    if (counts.VILLAGER <= 0) break;
    counts[role] = 1;
    counts.VILLAGER -= 1;
  }
  return counts;
}

export function totalRoleCount(counts: RoleCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}
