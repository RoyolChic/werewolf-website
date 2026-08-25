import type { WitchSelfSaveRule, DeadViewMode } from "../types/room";
import type { OptionalRole } from "../constants/roles";
import type { PublicRoomState } from "../types/publicState";
import type { PrivatePlayerState } from "../types/privateState";
import type { Faction } from "../types/role";

// ---- Client -> Server payloads ----

export interface CreateRoomPayload {
  maxPlayers: number;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
  hostName: string;
  optionalRoles?: OptionalRole[];
}

export interface JoinRoomPayload {
  roomId: string;
  name: string;
  reconnectToken?: string;
}

export interface ConfirmReconnectPayload {
  roomId: string;
  name: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface KickPlayerPayload {
  roomId: string;
  targetPlayerId: string;
}

export interface PickCardPayload {
  roomId: string;
  cardIndex: number;
}

export interface ConfirmCardPayload {
  roomId: string;
  cardIndex: number;
}

export interface CancelCardPayload {
  roomId: string;
}

export interface ConfirmRolePayload {
  roomId: string;
}

export interface SetDayDiscussionSecondsPayload {
  roomId: string;
  seconds: number;
}

export interface SetWitchSelfSaveRulePayload {
  roomId: string;
  rule: WitchSelfSaveRule;
}

export interface SetMaxPlayersPayload {
  roomId: string;
  maxPlayers: number;
}

export interface SetOptionalRolesPayload {
  roomId: string;
  roles: OptionalRole[];
}

export interface SetDeadViewModePayload {
  roomId: string;
  mode: DeadViewMode;
}

export interface SkipDayDiscussionPayload {
  roomId: string;
}

export interface EndLastWordsPayload {
  roomId: string;
}

export interface StartCardPickingPayload {
  roomId: string;
}

export interface WerewolfVotePayload {
  roomId: string;
  targetPlayerId: string;
}

export interface WerewolfConfirmVotePayload {
  roomId: string;
}

export interface WerewolfUnconfirmVotePayload {
  roomId: string;
}

export interface SeerCheckPayload {
  roomId: string;
  targetPlayerId: string;
}

export interface WitchActionPayload {
  roomId: string;
  action: "SAVE" | "POISON" | "SKIP";
  targetPlayerId?: string;
}

export interface GuardProtectPayload {
  roomId: string;
  targetPlayerId: string;
}

export interface HunterShootPayload {
  roomId: string;
  targetPlayerId: string | null;
}

export interface KnightDuelPayload {
  roomId: string;
  targetPlayerId: string;
}

export interface DayVotePayload {
  roomId: string;
  targetPlayerId: string | null;
}

export interface RequestRoomStatePayload {
  roomId: string;
}

// ---- Server -> Client payloads ----

export interface RoomCreatedPayload {
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

export interface ReconnectConfirmationRequiredPayload {
  roomId: string;
  name: string;
}

export interface PhaseChangedPayload {
  roomId: string;
  phase: PublicRoomState["phase"];
}

export interface ActionResultPayload {
  ok: boolean;
  event: string;
  message?: string;
}

export interface DayAnnouncementPayload {
  roomId: string;
  dayNumber: number;
  deadPlayerIds: string[];
}

export interface VoteResultPayload {
  roomId: string;
  round: 1 | 2;
  exiledPlayerId: string | null;
}

export interface GameOverPayload {
  roomId: string;
  winner: Faction;
  revealedRoles: Record<string, string>;
}

export interface RoomClosedPayload {
  roomId: string;
  reason: "IDLE_TIMEOUT" | "HOST_CLOSED";
}

export interface PlayerKickedPayload {
  roomId: string;
  playerId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type RoomStateUpdatedPayload = PublicRoomState;
export type PrivateStateUpdatedPayload = PrivatePlayerState;
