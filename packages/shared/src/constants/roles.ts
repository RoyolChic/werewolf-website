import type { Role } from "../types/role";

export const ROLE_LABELS: Record<Role, string> = {
  WEREWOLF: "狼人",
  SEER: "預言家",
  WITCH: "女巫",
  HUNTER: "獵人",
  GUARD: "守衛",
  KNIGHT: "騎士",
  VILLAGER: "平民",
};

export const FACTION_LABELS: Record<"WEREWOLF" | "VILLAGER", string> = {
  WEREWOLF: "狼人陣營",
  VILLAGER: "好人陣營",
};

/**
 * Roles a host can optionally add to a game beyond the fixed werewolf/seer/witch core -- each one
 * selected swaps out one villager slot (see getRoleCountsForPlayerCount).
 */
export const OPTIONAL_ROLES = ["HUNTER", "GUARD", "KNIGHT"] as const;

export type OptionalRole = (typeof OPTIONAL_ROLES)[number];
