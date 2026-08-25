import { DAY_DISCUSSION_SECONDS_DEFAULT, MIN_PLAYERS } from "../constants/room";
import type { OptionalRole } from "../constants/roles";
import type { WitchSelfSaveRule, DeadViewMode, RoomConfig } from "../types/room";
import { getRoleCountsForPlayerCount } from "./roomConfigs";

export const DEFAULT_WITCH_SELF_SAVE_RULE: WitchSelfSaveRule = "FIRST_NIGHT_ONLY";
export const DEFAULT_DEAD_VIEW_MODE: DeadViewMode = "HIDDEN";

export function createDefaultRoomConfig(maxPlayers: number = MIN_PLAYERS, optionalRoles: OptionalRole[] = []): RoomConfig {
  return {
    maxPlayers,
    roleCounts: getRoleCountsForPlayerCount(maxPlayers, optionalRoles),
    dayDiscussionSeconds: DAY_DISCUSSION_SECONDS_DEFAULT,
    witchSelfSaveRule: DEFAULT_WITCH_SELF_SAVE_RULE,
    optionalRoles,
  };
}
