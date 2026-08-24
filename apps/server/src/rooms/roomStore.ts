import type { RoomConfig } from "@kill-wolf/shared";
import type { GameState, Room } from "./roomTypes";
import { createRoomId } from "../utils/createRoomId";

const rooms = new Map<string, Room>();

function createInitialGameState(): GameState {
  return {
    phase: "LOBBY",
    dayNumber: 0,
    nightNumber: 0,
    werewolfVotes: new Map(),
    seerChecks: [],
    witch: {
      hasAntidote: true,
      hasPoison: true,
      usedAntidoteOn: null,
      usedPoisonOn: null,
    },
    witchActedTonight: false,
    nightKillTargetPlayerId: null,
    nightSavedPlayerId: null,
    nightPoisonedPlayerId: null,
    roleConfirmedPlayerIds: new Set(),
    dayVotes: new Map(),
    voteRound: 1,
    voteRunoffCandidateIds: null,
    lastNightDeathPlayerIds: null,
    exileResult: null,
    winner: null,
    discussionEndsAt: null,
    discussionRemainingMsAtPause: null,
    discussionSkipRequesterIds: new Set(),
  };
}

export function createRoom(config: RoomConfig, hostPlayerId: string): Room {
  let roomId = createRoomId();
  while (rooms.has(roomId)) {
    roomId = createRoomId();
  }

  const now = Date.now();
  const room: Room = {
    roomId,
    maxPlayers: config.maxPlayers,
    roleCounts: config.roleCounts,
    dayDiscussionSeconds: config.dayDiscussionSeconds,
    witchSelfSaveRule: config.witchSelfSaveRule,
    hostPlayerId,
    players: new Map(),
    playerOrder: [],
    cards: [],
    gameState: createInitialGameState(),
    createdAt: now,
    lastActivityAt: now,
    kickedNames: new Set(),
    pendingReconnectClaims: new Map(),
    discussionTimeoutHandle: null,
    transitionTimeoutHandle: null,
  };

  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room?.discussionTimeoutHandle) {
    clearTimeout(room.discussionTimeoutHandle);
  }
  if (room?.transitionTimeoutHandle) {
    clearTimeout(room.transitionTimeoutHandle);
  }
  rooms.delete(roomId);
}

export function touchRoom(room: Room): void {
  room.lastActivityAt = Date.now();
}

export function getAllRooms(): Room[] {
  return [...rooms.values()];
}

export function clearAllRoomsForTest(): void {
  for (const room of rooms.values()) {
    deleteRoom(room.roomId);
  }
}
