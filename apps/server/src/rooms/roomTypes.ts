import type {
  DeadViewMode,
  ExileResult,
  Faction,
  GamePhase,
  Role,
  RoleCounts,
  WitchSelfSaveRule,
} from "@kill-wolf/shared";

export interface Player {
  playerId: string;
  socketId: string | null;
  name: string;
  role: Role | null;
  cardIndex: number | null;
  isAlive: boolean;
  isConnected: boolean;
  reconnectToken: string | null;
  deadViewMode: DeadViewMode;
  joinedAt: number;
}

export interface Card {
  cardIndex: number;
  role: Role;
  isLocked: boolean;
  lockedByPlayerId: string | null;
  hoveringPlayerIds: Set<string>;
}

export interface WitchState {
  hasAntidote: boolean;
  hasPoison: boolean;
  usedAntidoteOn: string | null;
  usedPoisonOn: string | null;
}

export interface SeerCheckRecordInternal {
  night: number;
  seerPlayerId: string;
  targetPlayerId: string;
  faction: Faction;
}

export interface GameState {
  phase: GamePhase;
  dayNumber: number;
  nightNumber: number;
  werewolfVotes: Map<string, string>;
  seerChecks: SeerCheckRecordInternal[];
  witch: WitchState;
  witchActedTonight: boolean;
  nightKillTargetPlayerId: string | null;
  nightSavedPlayerId: string | null;
  nightPoisonedPlayerId: string | null;
  roleConfirmedPlayerIds: Set<string>;
  dayVotes: Map<string, string | null>;
  voteRound: 1 | 2;
  voteRunoffCandidateIds: string[] | null;
  lastNightDeathPlayerIds: string[] | null;
  exileResult: ExileResult | null;
  winner: Faction | null;
  discussionEndsAt: number | null;
  discussionRemainingMsAtPause: number | null;
  discussionSkipRequesterIds: Set<string>;
}

export interface PendingReconnectClaim {
  offlinePlayerId: string;
  requesterSocketId: string;
}

export interface Room {
  roomId: string;
  maxPlayers: number;
  roleCounts: RoleCounts;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
  hostPlayerId: string;
  players: Map<string, Player>;
  playerOrder: string[];
  cards: Card[];
  gameState: GameState;
  createdAt: number;
  lastActivityAt: number;
  kickedNames: Set<string>;
  pendingReconnectClaims: Map<string, PendingReconnectClaim>;
  discussionTimeoutHandle: NodeJS.Timeout | null;
  transitionTimeoutHandle: NodeJS.Timeout | null;
}
