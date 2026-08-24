import type { Role, Faction } from "./role";
import type { DeadViewMode } from "./room";

export const ACTION_TYPES = [
  "PICK_CARD",
  "CONFIRM_CARD",
  "CANCEL_CARD",
  "CONFIRM_ROLE",
  "WEREWOLF_VOTE",
  "SEER_CHECK",
  "WITCH_ACTION",
  "DAY_VOTE",
  "SKIP_DAY_DISCUSSION",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface SeerCheckRecord {
  night: number;
  targetPlayerId: string;
  faction: Faction;
}

export interface WitchPrivateInfo {
  hasAntidote: boolean;
  hasPoison: boolean;
  tonightKilledPlayerId: string | null;
}

export interface PrivatePlayerState {
  playerId: string;
  role: Role | null;
  werewolfAllyPlayerIds: string[] | null;
  /** Live NIGHT_WEREWOLF tally: voterPlayerId -> targetPlayerId. Only populated for werewolves. */
  werewolfVotes: Record<string, string> | null;
  seerChecks: SeerCheckRecord[] | null;
  witch: WitchPrivateInfo | null;
  deadViewMode: DeadViewMode;
  availableActions: ActionType[];
  reconnectToken?: string;
}
