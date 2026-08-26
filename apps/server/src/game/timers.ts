import { LAST_WORDS_SECONDS, getNightActionSeconds } from "@kill-wolf/shared";
import type { Room } from "../rooms/roomTypes";
import { broadcastRoom } from "../rooms/roomBroadcast";
import { advanceToNextSpeakerOrVote, finishLastWords, runNightActionTimeout } from "./phases";

export function clearDiscussionTimer(room: Room): void {
  if (room.discussionTimeoutHandle) {
    clearTimeout(room.discussionTimeoutHandle);
    room.discussionTimeoutHandle = null;
  }
}

export function startDiscussionTimer(room: Room): void {
  clearDiscussionTimer(room);
  const remainingMs = room.gameState.discussionRemainingMsAtPause ?? room.dayDiscussionSeconds * 1000;
  room.gameState.discussionRemainingMsAtPause = null;
  room.gameState.discussionEndsAt = Date.now() + remainingMs;
  room.discussionTimeoutHandle = setTimeout(() => {
    room.discussionTimeoutHandle = null;
    room.gameState.discussionEndsAt = null;
    advanceToNextSpeakerOrVote(room);
    broadcastRoom(room);
  }, remainingMs);
}

function isDiscussionPhase(room: Room): boolean {
  return room.gameState.phase === "DAY_DISCUSSION" || room.gameState.phase === "DAY_TIEBREAK_DISCUSSION";
}

export function pauseDiscussionTimerIfRunning(room: Room): void {
  if (!isDiscussionPhase(room) || room.gameState.discussionEndsAt === null) {
    return;
  }
  const remainingMs = Math.max(0, room.gameState.discussionEndsAt - Date.now());
  room.gameState.discussionRemainingMsAtPause = remainingMs;
  room.gameState.discussionEndsAt = null;
  clearDiscussionTimer(room);
}

export function resumeDiscussionTimerIfPaused(room: Room): void {
  if (!isDiscussionPhase(room) || room.gameState.discussionEndsAt !== null) {
    return;
  }
  if (room.gameState.discussionRemainingMsAtPause === null) {
    return;
  }
  startDiscussionTimer(room);
}

const NIGHT_ACTION_PHASES = ["NIGHT_GUARD", "NIGHT_WEREWOLF", "NIGHT_SEER", "NIGHT_WITCH", "HUNTER_SHOOT"] as const;

function isNightActionPhase(room: Room): boolean {
  return (NIGHT_ACTION_PHASES as readonly string[]).includes(room.gameState.phase);
}

export function clearNightActionTimer(room: Room): void {
  if (room.nightActionTimeoutHandle) {
    clearTimeout(room.nightActionTimeoutHandle);
    room.nightActionTimeoutHandle = null;
  }
}

export function startNightActionTimer(room: Room): void {
  clearNightActionTimer(room);
  const remainingMs =
    room.gameState.nightActionRemainingMsAtPause ?? getNightActionSeconds(room.gameState.phase) * 1000;
  room.gameState.nightActionRemainingMsAtPause = null;
  room.gameState.nightActionEndsAt = Date.now() + remainingMs;
  room.nightActionTimeoutHandle = setTimeout(() => {
    room.nightActionTimeoutHandle = null;
    room.gameState.nightActionEndsAt = null;
    runNightActionTimeout(room);
    broadcastRoom(room);
  }, remainingMs);
}

export function pauseNightActionTimerIfRunning(room: Room): void {
  if (!isNightActionPhase(room) || room.gameState.nightActionEndsAt === null) {
    return;
  }
  const remainingMs = Math.max(0, room.gameState.nightActionEndsAt - Date.now());
  room.gameState.nightActionRemainingMsAtPause = remainingMs;
  room.gameState.nightActionEndsAt = null;
  clearNightActionTimer(room);
}

export function resumeNightActionTimerIfPaused(room: Room): void {
  if (!isNightActionPhase(room) || room.gameState.nightActionEndsAt !== null) {
    return;
  }
  if (room.gameState.nightActionRemainingMsAtPause === null) {
    return;
  }
  startNightActionTimer(room);
}

function isLastWordsPhase(room: Room): boolean {
  return room.gameState.phase === "DAY_LAST_WORDS";
}

export function clearLastWordsTimer(room: Room): void {
  if (room.lastWordsTimeoutHandle) {
    clearTimeout(room.lastWordsTimeoutHandle);
    room.lastWordsTimeoutHandle = null;
  }
}

export function startLastWordsTimer(room: Room): void {
  clearLastWordsTimer(room);
  const remainingMs = room.gameState.lastWordsRemainingMsAtPause ?? LAST_WORDS_SECONDS * 1000;
  room.gameState.lastWordsRemainingMsAtPause = null;
  room.gameState.lastWordsEndsAt = Date.now() + remainingMs;
  room.lastWordsTimeoutHandle = setTimeout(() => {
    room.lastWordsTimeoutHandle = null;
    room.gameState.lastWordsEndsAt = null;
    finishLastWords(room);
    broadcastRoom(room);
  }, remainingMs);
}

export function pauseLastWordsTimerIfRunning(room: Room): void {
  if (!isLastWordsPhase(room) || room.gameState.lastWordsEndsAt === null) {
    return;
  }
  const remainingMs = Math.max(0, room.gameState.lastWordsEndsAt - Date.now());
  room.gameState.lastWordsRemainingMsAtPause = remainingMs;
  room.gameState.lastWordsEndsAt = null;
  clearLastWordsTimer(room);
}

export function resumeLastWordsTimerIfPaused(room: Room): void {
  if (!isLastWordsPhase(room) || room.gameState.lastWordsEndsAt !== null) {
    return;
  }
  if (room.gameState.lastWordsRemainingMsAtPause === null) {
    return;
  }
  startLastWordsTimer(room);
}
