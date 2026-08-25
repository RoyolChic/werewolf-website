export const ROLES = ["WEREWOLF", "SEER", "WITCH", "HUNTER", "GUARD", "KNIGHT", "VILLAGER"] as const;

export type Role = (typeof ROLES)[number];

export const FACTIONS = ["WEREWOLF", "VILLAGER"] as const;

export type Faction = (typeof FACTIONS)[number];

export function roleFaction(role: Role): Faction {
  return role === "WEREWOLF" ? "WEREWOLF" : "VILLAGER";
}
