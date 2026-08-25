import type {
  DeadViewMode,
  ExileResult,
  Faction,
  GamePhase,
  NightHistoryEntry,
  OptionalRole,
  Role,
  RoleCounts,
  VoteHistoryEntry,
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
  werewolfConfirmedPlayerIds: Set<string>;
  seerChecks: SeerCheckRecordInternal[];
  witch: WitchState;
  witchActedTonight: boolean;
  nightKillTargetPlayerId: string | null;
  nightSavedPlayerId: string | null;
  nightPoisonedPlayerId: string | null;
  /** Who the guard is protecting tonight; null until they act (or if there's no guard). */
  nightGuardedPlayerId: string | null;
  /** Who the guard protected last night -- they can't pick the same target two nights running. */
  lastGuardedPlayerId: string | null;
  /** Set while a hunter who just died (and isn't excluded by poison) is deciding whether to shoot. */
  pendingHunterShooterPlayerId: string | null;
  /** Which phase to resume once the pending hunter shot resolves (DAY_DISCUSSION or NIGHT_START). */
  hunterShootReturnPhase: GamePhase | null;
  /** The knight's duel is a once-per-game ability. */
  knightDuelUsed: boolean;
  /** Players whose role has been publicly revealed mid-game (e.g. a knight who has dueled), on
   * top of the full reveal that happens at GAME_OVER. */
  revealedPlayerIds: Set<string>;
  roleConfirmedPlayerIds: Set<string>;
  dayVotes: Map<string, string | null>;
  voteRound: 1 | 2;
  voteRunoffCandidateIds: string[] | null;
  lastNightDeathPlayerIds: string[] | null;
  exileResult: ExileResult | null;
  nightHistory: NightHistoryEntry[];
  voteHistory: VoteHistoryEntry[];
  winner: Faction | null;
  discussionEndsAt: number | null;
  discussionRemainingMsAtPause: number | null;
  nightActionEndsAt: number | null;
  nightActionRemainingMsAtPause: number | null;
  /** Speaking order for the current day's discussion, alive playerIds only, seat order. */
  discussionSpeakingOrder: string[];
  /** Index into discussionSpeakingOrder of whoever currently holds the floor. */
  currentSpeakerIndex: number;
  /** Who's giving their last words before night falls; null outside DAY_LAST_WORDS. */
  lastWordsPlayerId: string | null;
  lastWordsEndsAt: number | null;
  lastWordsRemainingMsAtPause: number | null;
  /**
   * Seat index (into Room.playerOrder) of whoever was most recently removed from the game --
   * either exiled or killed overnight. Determines where the next day's speaking order starts
   * (the seat right after them). -1 before anyone has died, so day 1 starts at seat 0.
   */
  lastRemovedSeatIndex: number;
}

export interface PendingReconnectClaim {
  offlinePlayerId: string;
  requesterSocketId: string;
}

export interface Room {
  roomId: string;
  maxPlayers: number;
  roleCounts: RoleCounts;
  optionalRoles: OptionalRole[];
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
  nightActionTimeoutHandle: NodeJS.Timeout | null;
  transitionTimeoutHandle: NodeJS.Timeout | null;
  lastWordsTimeoutHandle: NodeJS.Timeout | null;
}
