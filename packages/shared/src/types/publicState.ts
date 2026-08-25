import type { GamePhase } from "./phase";
import type { Role } from "./role";
import type { PlayerPublicState } from "./player";
import type { CardPublicState } from "./card";
import type { RoleCounts, WitchSelfSaveRule } from "./room";
import type { ExileResult, NightHistoryEntry, VoteHistoryEntry, Winner } from "./gameState";

export interface PublicRoomState {
  roomId: string;
  phase: GamePhase;
  maxPlayers: number;
  roleCounts: RoleCounts;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
  hostPlayerId: string;
  players: PlayerPublicState[];
  cards: CardPublicState[];
  dayNumber: number;
  nightNumber: number;
  discussionSecondsRemaining: number | null;
  /** Absolute epoch ms the discussion countdown ends at; null while paused or outside DAY_DISCUSSION. Lets clients tick locally instead of relying on a steady stream of broadcasts. */
  discussionEndsAt: number | null;
  nightActionSecondsRemaining: number | null;
  /** Absolute epoch ms the current night action (werewolf/seer/witch) countdown ends at; null while paused or outside those phases. */
  nightActionEndsAt: number | null;
  /** This day's speaking order (alive playerIds only); empty outside DAY_DISCUSSION. */
  discussionSpeakingOrder: string[];
  /** Whoever currently holds the floor; null outside DAY_DISCUSSION. */
  currentSpeakerPlayerId: string | null;
  /** Who's giving their last words; null outside DAY_LAST_WORDS. */
  lastWordsPlayerId: string | null;
  lastWordsSecondsRemaining: number | null;
  /** Absolute epoch ms the last-words countdown ends at; null while paused or outside DAY_LAST_WORDS. */
  lastWordsEndsAt: number | null;
  lastNightDeathPlayerIds: string[] | null;
  /** Set while a hunter who just died is deciding whether to shoot; null otherwise. */
  pendingHunterShooterPlayerId: string | null;
  exileResult: ExileResult | null;
  /** Full history of every night's deaths so far, oldest first; never cleared during the game. */
  nightHistory: NightHistoryEntry[];
  /** Full history of every day-vote round so far, oldest first; never cleared during the game. */
  voteHistory: VoteHistoryEntry[];
  winner: Winner;
  isPaused: boolean;
  disconnectedPlayerIds: string[];
  revealedRoles: Record<string, Role> | null;
}
