import type { Role, Faction } from "./role";
import type { DeadViewMode } from "./room";

export const ACTION_TYPES = [
  "PICK_CARD",
  "CONFIRM_CARD",
  "CANCEL_CARD",
  "CONFIRM_ROLE",
  "WEREWOLF_VOTE",
  "WEREWOLF_CONFIRM_VOTE",
  "WEREWOLF_UNCONFIRM_VOTE",
  "SEER_CHECK",
  "WITCH_ACTION",
  "GUARD_PROTECT",
  "HUNTER_SHOOT",
  "KNIGHT_DUEL",
  "DAY_VOTE",
  "SKIP_DAY_DISCUSSION",
  "END_LAST_WORDS",
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

export interface GuardPrivateInfo {
  /** Who this guard protected last night; they can't pick the same target again tonight. */
  lastProtectedPlayerId: string | null;
}

export interface KnightPrivateInfo {
  /** The duel can only be used once for the whole game. */
  duelUsed: boolean;
}

export interface PrivatePlayerState {
  playerId: string;
  role: Role | null;
  /** Which card-art variant to render for this player's role (see getRoleImagePath); 0 when role is null. */
  roleImageVariantIndex: number;
  werewolfAllyPlayerIds: string[] | null;
  /** Live NIGHT_WEREWOLF tally: voterPlayerId -> targetPlayerId. Only populated for werewolves. */
  werewolfVotes: Record<string, string> | null;
  /** Werewolf playerIds who have locked in their current target. Only populated for werewolves. */
  werewolfConfirmedPlayerIds: string[] | null;
  seerChecks: SeerCheckRecord[] | null;
  witch: WitchPrivateInfo | null;
  guard: GuardPrivateInfo | null;
  knight: KnightPrivateInfo | null;
  deadViewMode: DeadViewMode;
  /** Every player's role, populated only for a dead viewer whose deadViewMode is FULL -- lets a
   * dead spectator see everyone's identity without leaking it to anyone still alive. */
  spectatorRevealedRoles: Record<string, Role> | null;
  availableActions: ActionType[];
  reconnectToken?: string;
}
