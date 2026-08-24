import type { Role } from "../types/role";

export const ROLE_LABELS: Record<Role, string> = {
  WEREWOLF: "狼人",
  SEER: "預言家",
  WITCH: "女巫",
  VILLAGER: "平民",
};

export const FACTION_LABELS: Record<"WEREWOLF" | "VILLAGER", string> = {
  WEREWOLF: "狼人陣營",
  VILLAGER: "好人陣營",
};
