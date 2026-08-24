import { DAY_DISCUSSION_SECONDS_DEFAULT, MIN_PLAYERS } from "../constants/room";
import type { WitchSelfSaveRule, DeadViewMode, RoomConfig } from "../types/room";
import { getRoleCountsForPlayerCount } from "./roomConfigs";

export const DEFAULT_WITCH_SELF_SAVE_RULE: WitchSelfSaveRule = "FIRST_NIGHT_ONLY";
export const DEFAULT_DEAD_VIEW_MODE: DeadViewMode = "HIDDEN";

export function createDefaultRoomConfig(maxPlayers: number = MIN_PLAYERS): RoomConfig {
  return {
    maxPlayers,
    roleCounts: getRoleCountsForPlayerCount(maxPlayers),
    dayDiscussionSeconds: DAY_DISCUSSION_SECONDS_DEFAULT,
    witchSelfSaveRule: DEFAULT_WITCH_SELF_SAVE_RULE,
  };
}
