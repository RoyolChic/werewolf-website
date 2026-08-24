export interface RoleCounts {
  WEREWOLF: number;
  SEER: number;
  WITCH: number;
  VILLAGER: number;
}

export const WITCH_SELF_SAVE_RULES = ["FIRST_NIGHT_ONLY", "ANYTIME"] as const;

export type WitchSelfSaveRule = (typeof WITCH_SELF_SAVE_RULES)[number];

export const DEAD_VIEW_MODES = ["HIDDEN", "FULL"] as const;

export type DeadViewMode = (typeof DEAD_VIEW_MODES)[number];

export interface RoomConfig {
  maxPlayers: number;
  roleCounts: RoleCounts;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
}
