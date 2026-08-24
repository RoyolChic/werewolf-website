import { vi } from "vitest";
import type { WitchSelfSaveRule } from "@kill-wolf/shared";
import { createRoomAndJoin, joinRoom } from "../src/rooms/roomService";
import { confirmCard, confirmRole, dayVote, skipDayDiscussion, startCardPicking } from "../src/game/engine";
import type { Room } from "../src/rooms/roomTypes";

export interface TestRoom {
  room: Room;
  playerIds: string[];
}

export function createTestRoom(
  playerCount: number,
  witchSelfSaveRule: WitchSelfSaveRule = "FIRST_NIGHT_ONLY",
): TestRoom {
  const hostResult = createRoomAndJoin({
    maxPlayers: playerCount,
    dayDiscussionSeconds: 60,
    witchSelfSaveRule,
    hostName: "P1",
    socketId: "socket-1",
  });
  if (!hostResult.ok) {
    throw new Error(`failed to create room: ${hostResult.message}`);
  }

  const room = hostResult.room;
  const playerIds = [hostResult.player.playerId];

  for (let i = 2; i <= playerCount; i += 1) {
    const result = joinRoom({ roomId: room.roomId, name: `P${i}`, socketId: `socket-${i}` });
    if (!result.ok) {
      throw new Error(`failed to join room: ${result.message}`);
    }
    playerIds.push(result.player.playerId);
  }

  return { room, playerIds };
}

export function completeCardPickingAndReveal(room: Room, playerIds: string[]): void {
  const startResult = startCardPicking(room, playerIds[0]);
  if (!startResult.ok) {
    throw new Error(`failed to start card picking: ${startResult.message}`);
  }

  playerIds.forEach((playerId, index) => {
    const outcome = confirmCard(room, playerId, index);
    if (!outcome.ok) {
      throw new Error(`failed to confirm card: ${outcome.message}`);
    }
  });
}

export function confirmAllRolesAndStartNight(room: Room, playerIds: string[]): void {
  for (const playerId of playerIds) {
    const outcome = confirmRole(room, playerId);
    if (!outcome.ok) {
      throw new Error(`failed to confirm role: ${outcome.message}`);
    }
  }
  vi.advanceTimersByTime(1500);
}

export function setupNightReadyRoom(
  playerCount: number,
  witchSelfSaveRule: WitchSelfSaveRule = "FIRST_NIGHT_ONLY",
): TestRoom {
  const { room, playerIds } = createTestRoom(playerCount, witchSelfSaveRule);
  completeCardPickingAndReveal(room, playerIds);
  confirmAllRolesAndStartNight(room, playerIds);
  return { room, playerIds };
}

export function playersWithRole(room: Room, role: string): string[] {
  return [...room.players.values()].filter((p) => p.role === role).map((p) => p.playerId);
}

export function advanceThroughAnnouncementToDiscussion(): void {
  vi.advanceTimersByTime(3500);
}

export function advanceThroughExileToNextNight(): void {
  // DAY_EXILE_RESULT -> NIGHT_START is a 3000ms hop, and NIGHT_START itself schedules another
  // 1200ms hop into NIGHT_WEREWOLF; advance far enough to flush both chained timers.
  vi.advanceTimersByTime(4500);
}

/**
 * From DAY_ANNOUNCEMENT (right after a night resolves with no winner), fast-forwards through an
 * uneventful day (everyone skips discussion, everyone abstains) all the way into NIGHT_WEREWOLF
 * of the following night, without anyone dying or being exiled.
 */
export function skipWholeDayIntoNextNight(room: Room): void {
  advanceThroughAnnouncementToDiscussion();
  expect_(room.gameState.phase === "DAY_DISCUSSION", "expected DAY_DISCUSSION after announcement");

  skipAllSpeakingTurns(room);
  expect_(room.gameState.phase === "DAY_VOTE", "expected DAY_VOTE after everyone's turn is skipped");

  for (const player of room.players.values()) {
    if (player.isAlive) {
      dayVote(room, player.playerId, null);
    }
  }
  expect_(room.gameState.phase === "DAY_EXILE_RESULT", "expected DAY_EXILE_RESULT after all abstain");

  advanceThroughExileToNextNight();
  expect_(room.gameState.phase === "NIGHT_WEREWOLF", "expected NIGHT_WEREWOLF at the start of the next night");
}

/** Skips every alive player's speaking turn in order, driving DAY_DISCUSSION through to DAY_VOTE. */
export function skipAllSpeakingTurns(room: Room): void {
  let guard = 0;
  while (room.gameState.phase === "DAY_DISCUSSION") {
    const currentSpeakerId = room.gameState.discussionSpeakingOrder[room.gameState.currentSpeakerIndex];
    if (!currentSpeakerId) break;
    const outcome = skipDayDiscussion(room, currentSpeakerId);
    if (!outcome.ok) {
      throw new Error(`failed to skip speaking turn: ${outcome.message}`);
    }
    guard += 1;
    if (guard > 50) {
      throw new Error("skipAllSpeakingTurns did not terminate");
    }
  }
}

function expect_(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
