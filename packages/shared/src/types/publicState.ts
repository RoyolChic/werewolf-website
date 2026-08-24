import type { GamePhase } from "./phase";
import type { Role } from "./role";
import type { PlayerPublicState } from "./player";
import type { CardPublicState } from "./card";
import type { RoleCounts, WitchSelfSaveRule } from "./room";
import type { ExileResult, Winner } from "./gameState";

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
  /** This day's speaking order (alive playerIds only); empty outside DAY_DISCUSSION. */
  discussionSpeakingOrder: string[];
  /** Whoever currently holds the floor; null outside DAY_DISCUSSION. */
  currentSpeakerPlayerId: string | null;
  lastNightDeathPlayerIds: string[] | null;
  exileResult: ExileResult | null;
  winner: Winner;
  isPaused: boolean;
  disconnectedPlayerIds: string[];
  revealedRoles: Record<string, Role> | null;
}
