import { vi } from "vitest";
import { LAST_WORDS_SECONDS, NIGHT_ACTION_SECONDS, type OptionalRole, type WitchSelfSaveRule } from "@kill-wolf/shared";
import { createRoomAndJoin, joinRoom } from "../src/rooms/roomService";
import {
  confirmCard,
  confirmRole,
  dayVote,
  skipDayDiscussion,
  startCardPicking,
  werewolfConfirmVote,
  werewolfVote,
} from "../src/game/engine";
import type { Room } from "../src/rooms/roomTypes";

export interface TestRoom {
  room: Room;
  playerIds: string[];
}

/** How long it takes NIGHT_GUARD or HUNTER_SHOOT to auto-resolve when nobody acts in them. */
const NIGHT_ACTION_TIMEOUT_MS = NIGHT_ACTION_SECONDS * 1000 + 100;
/** How long it takes DAY_LAST_WORDS to auto-resolve when nobody ends it early. */
const LAST_WORDS_TIMEOUT_MS = LAST_WORDS_SECONDS * 1000 + 100;

export function createTestRoom(
  playerCount: number,
  witchSelfSaveRule: WitchSelfSaveRule = "FIRST_NIGHT_ONLY",
  optionalRoles: OptionalRole[] = [],
): TestRoom {
  const hostResult = createRoomAndJoin({
    maxPlayers: playerCount,
    dayDiscussionSeconds: 60,
    witchSelfSaveRule,
    hostName: "P1",
    socketId: "socket-1",
    optionalRoles,
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
  vi.advanceTimersByTime(1500); // NIGHT_START -> NIGHT_GUARD
  // NIGHT_GUARD skips straight through when nobody was dealt the guard card (see phases.ts), so
  // only games that actually have a guard need fast-forwarding through its full timer to land in
  // NIGHT_WEREWOLF.
  const hasGuardInGame = [...room.players.values()].some((p) => p.role === "GUARD");
  if (hasGuardInGame) {
    vi.advanceTimersByTime(NIGHT_ACTION_TIMEOUT_MS);
  }
}

export function setupNightReadyRoom(
  playerCount: number,
  witchSelfSaveRule: WitchSelfSaveRule = "FIRST_NIGHT_ONLY",
  optionalRoles: OptionalRole[] = [],
): TestRoom {
  const { room, playerIds } = createTestRoom(playerCount, witchSelfSaveRule, optionalRoles);
  completeCardPickingAndReveal(room, playerIds);
  confirmAllRolesAndStartNight(room, playerIds);
  return { room, playerIds };
}

/**
 * Like setupNightReadyRoom, but stops right at NIGHT_GUARD instead of fast-forwarding past it --
 * for tests that need to actually drive the guard's action.
 */
export function setupGuardReadyRoom(
  playerCount: number,
  optionalRoles: OptionalRole[],
  witchSelfSaveRule: WitchSelfSaveRule = "FIRST_NIGHT_ONLY",
): TestRoom {
  const { room, playerIds } = createTestRoom(playerCount, witchSelfSaveRule, optionalRoles);
  completeCardPickingAndReveal(room, playerIds);
  for (const playerId of playerIds) {
    const outcome = confirmRole(room, playerId);
    if (!outcome.ok) {
      throw new Error(`failed to confirm role: ${outcome.message}`);
    }
  }
  // Exactly 1200ms, not a moment more -- NIGHT_START's transition into NIGHT_GUARD fires at
  // exactly 1200ms and immediately starts NIGHT_GUARD's own 60s timer; advancing any further
  // here would eat into that timer's budget before the test gets to it.
  vi.advanceTimersByTime(1200);
  return { room, playerIds };
}

export function playersWithRole(room: Room, role: string): string[] {
  return [...room.players.values()].filter((p) => p.role === role).map((p) => p.playerId);
}

/**
 * Drives the full select-then-confirm werewolf flow for every given wolf against the same
 * target, mirroring how the client now has to do it in two steps instead of one atomic vote.
 */
export function confirmWerewolfKill(room: Room, wolfIds: string[], targetPlayerId: string): void {
  for (const wolfId of wolfIds) {
    const outcome = werewolfVote(room, wolfId, targetPlayerId);
    if (!outcome.ok) {
      throw new Error(`failed to select werewolf target: ${outcome.message}`);
    }
  }
  for (const wolfId of wolfIds) {
    const outcome = werewolfConfirmVote(room, wolfId);
    if (!outcome.ok) {
      throw new Error(`failed to confirm werewolf vote: ${outcome.message}`);
    }
  }
}

export function advanceThroughAnnouncementToDiscussion(): void {
  vi.advanceTimersByTime(3500);
}

export function advanceThroughExileToNextNight(room: Room): void {
  // DAY_EXILE_RESULT -> DAY_LAST_WORDS (or straight to NIGHT_START if nobody was actually
  // exiled) is a 3000ms hop; DAY_LAST_WORDS only needs its own full timeout flushed on top of
  // that when someone was actually exiled and thus has last words to (not) give. From there,
  // NIGHT_START schedules another 1200ms hop into NIGHT_GUARD, which in turn only needs its own
  // full timeout flushed when this game actually has a guard to wait on (see phases.ts) --
  // otherwise each of these falls straight through to the next phase already.
  const wasExiled = room.gameState.exileResult?.exiledPlayerId != null;
  const hasGuardInGame = [...room.players.values()].some((p) => p.role === "GUARD");
  vi.advanceTimersByTime(
    4500 + (wasExiled ? LAST_WORDS_TIMEOUT_MS : 0) + (hasGuardInGame ? NIGHT_ACTION_TIMEOUT_MS : 0),
  );
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

  advanceThroughExileToNextNight(room);
  expect_(room.gameState.phase === "NIGHT_WEREWOLF", "expected NIGHT_WEREWOLF at the start of the next night");
}

/**
 * Skips every speaker's turn in order, driving either DAY_DISCUSSION or DAY_TIEBREAK_DISCUSSION
 * through to DAY_VOTE.
 */
export function skipAllSpeakingTurns(room: Room): void {
  let guard = 0;
  while (room.gameState.phase === "DAY_DISCUSSION" || room.gameState.phase === "DAY_TIEBREAK_DISCUSSION") {
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
