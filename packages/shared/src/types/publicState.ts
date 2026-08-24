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
  discussionSkipRequesterIds: string[];
  lastNightDeathPlayerIds: string[] | null;
  exileResult: ExileResult | null;
  winner: Winner;
  isPaused: boolean;
  disconnectedPlayerIds: string[];
  revealedRoles: Record<string, Role> | null;
}
