import type { Room } from "../rooms/roomTypes";
import { broadcastRoom } from "../rooms/roomBroadcast";
import { advanceToNextSpeakerOrVote } from "./phases";

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

export function pauseDiscussionTimerIfRunning(room: Room): void {
  if (room.gameState.phase !== "DAY_DISCUSSION" || room.gameState.discussionEndsAt === null) {
    return;
  }
  const remainingMs = Math.max(0, room.gameState.discussionEndsAt - Date.now());
  room.gameState.discussionRemainingMsAtPause = remainingMs;
  room.gameState.discussionEndsAt = null;
  clearDiscussionTimer(room);
}

export function resumeDiscussionTimerIfPaused(room: Room): void {
  if (room.gameState.phase !== "DAY_DISCUSSION" || room.gameState.discussionEndsAt !== null) {
    return;
  }
  if (room.gameState.discussionRemainingMsAtPause === null) {
    return;
  }
  startDiscussionTimer(room);
}
