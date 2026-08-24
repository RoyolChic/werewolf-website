import type { Faction, Role } from "../types/role";
import { roleFaction } from "../types/role";

export interface AlivePlayerRole {
  role: Role;
}

export function evaluateWinner(alivePlayers: AlivePlayerRole[]): Faction | null {
  const aliveWerewolfCount = alivePlayers.filter((p) => roleFaction(p.role) === "WEREWOLF").length;
  const aliveVillagerSideCount = alivePlayers.length - aliveWerewolfCount;

  if (aliveWerewolfCount === 0) {
    return "VILLAGER";
  }

  if (aliveWerewolfCount >= aliveVillagerSideCount) {
    return "WEREWOLF";
  }

  return null;
}
