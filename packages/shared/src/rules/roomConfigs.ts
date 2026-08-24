import type { RoleCounts } from "../types/room";

export const ROLE_COUNTS_BY_PLAYER_COUNT: Record<number, RoleCounts> = {
  6: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 2 },
  7: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 3 },
  8: { WEREWOLF: 2, SEER: 1, WITCH: 1, VILLAGER: 4 },
  9: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 4 },
  10: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 5 },
  11: { WEREWOLF: 3, SEER: 1, WITCH: 1, VILLAGER: 6 },
  12: { WEREWOLF: 4, SEER: 1, WITCH: 1, VILLAGER: 6 },
};

export function getRoleCountsForPlayerCount(playerCount: number): RoleCounts {
  const counts = ROLE_COUNTS_BY_PLAYER_COUNT[playerCount];
  if (!counts) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  return counts;
}

export function totalRoleCount(counts: RoleCounts): number {
  return counts.WEREWOLF + counts.SEER + counts.WITCH + counts.VILLAGER;
}
