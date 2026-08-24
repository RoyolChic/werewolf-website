import type { Role, RoleCounts } from "@kill-wolf/shared";
import { shuffle } from "../utils/random";
import type { Card } from "../rooms/roomTypes";

function flattenRoleCounts(roleCounts: RoleCounts): Role[] {
  const roles: Role[] = [];
  for (const [role, count] of Object.entries(roleCounts) as [Role, number][]) {
    for (let i = 0; i < count; i += 1) {
      roles.push(role);
    }
  }
  return roles;
}

export function createShuffledCards(roleCounts: RoleCounts): Card[] {
  const shuffledRoles = shuffle(flattenRoleCounts(roleCounts));
  return shuffledRoles.map((role, cardIndex) => ({
    cardIndex,
    role,
    isLocked: false,
    lockedByPlayerId: null,
    hoveringPlayerIds: new Set<string>(),
  }));
}
