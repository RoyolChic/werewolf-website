import type { GamePhase } from "@kill-wolf/shared";
import type { Player, Room } from "../rooms/roomTypes";
import { broadcastRoom } from "../rooms/roomBroadcast";
import { checkRoomWinner } from "./winConditions";
import { clearDiscussionTimer, startDiscussionTimer } from "./timers";

export function aliveWerewolves(room: Room): Player[] {
  return [...room.players.values()].filter((p) => p.isAlive && p.role === "WEREWOLF");
}

export function alivePlayerWithRole(room: Room, role: Player["role"]): Player | undefined {
  return [...room.players.values()].find((p) => p.isAlive && p.role === role);
}

export function alivePlayers(room: Room): Player[] {
  return [...room.players.values()].filter((p) => p.isAlive);
}

function clearTransitionTimeout(room: Room): void {
  if (room.transitionTimeoutHandle) {
    clearTimeout(room.transitionTimeoutHandle);
    room.transitionTimeoutHandle = null;
  }
}

function scheduleDelayedTransition(room: Room, delayMs: number, nextPhase: GamePhase): void {
  clearTransitionTimeout(room);
  room.transitionTimeoutHandle = setTimeout(() => {
    room.transitionTimeoutHandle = null;
    enterPhase(room, nextPhase);
    broadcastRoom(room);
  }, delayMs);
}

function computeNightDeaths(room: Room): string[] {
  const { gameState } = room;
  const deaths = new Set<string>();

  if (gameState.nightKillTargetPlayerId && gameState.nightKillTargetPlayerId !== gameState.nightSavedPlayerId) {
    deaths.add(gameState.nightKillTargetPlayerId);
  }
  if (gameState.nightPoisonedPlayerId) {
    deaths.add(gameState.nightPoisonedPlayerId);
  }
  return [...deaths];
}

function markLastRemoved(room: Room, playerId: string): void {
  const seatIndex = room.playerOrder.indexOf(playerId);
  if (seatIndex !== -1) {
    room.gameState.lastRemovedSeatIndex = seatIndex;
  }
}

/**
 * Each day's speaking order starts at the seat right after whoever was most recently removed
 * (the prior day's exile if there was one, otherwise the prior night's death), wrapping through
 * every currently alive player exactly once in fixed seat order.
 */
function computeSpeakingOrder(room: Room): string[] {
  const seats = room.playerOrder;
  const n = seats.length;
  if (n === 0) return [];

  const order: string[] = [];
  for (let offset = 1; offset <= n; offset += 1) {
    const seatIndex = (room.gameState.lastRemovedSeatIndex + offset + n) % n;
    const playerId = seats[seatIndex];
    if (room.players.get(playerId)?.isAlive) {
      order.push(playerId);
    }
  }
  return order;
}

/**
 * Called when the current speaker's turn ends (their timer expired, or they skipped it).
 * Hands the floor to the next speaker in this day's order, or moves on to voting once
 * everyone has had their turn.
 */
export function advanceToNextSpeakerOrVote(room: Room): void {
  room.gameState.currentSpeakerIndex += 1;
  if (room.gameState.currentSpeakerIndex >= room.gameState.discussionSpeakingOrder.length) {
    enterPhase(room, "DAY_VOTE");
  } else {
    startDiscussionTimer(room);
  }
}

export function enterPhase(room: Room, phase: GamePhase): void {
  room.gameState.phase = phase;

  switch (phase) {
    case "NIGHT_START": {
      room.gameState.nightNumber += 1;
      room.gameState.werewolfVotes.clear();
      room.gameState.nightKillTargetPlayerId = null;
      room.gameState.nightSavedPlayerId = null;
      room.gameState.nightPoisonedPlayerId = null;
      room.gameState.witchActedTonight = false;
      room.gameState.lastNightDeathPlayerIds = null;
      room.gameState.exileResult = null;
      scheduleDelayedTransition(room, 1200, "NIGHT_WEREWOLF");
      break;
    }
    case "NIGHT_WEREWOLF": {
      clearTransitionTimeout(room);
      break;
    }
    case "NIGHT_SEER": {
      clearTransitionTimeout(room);
      if (!alivePlayerWithRole(room, "SEER")) {
        enterPhase(room, "NIGHT_WITCH");
      }
      break;
    }
    case "NIGHT_WITCH": {
      clearTransitionTimeout(room);
      if (!alivePlayerWithRole(room, "WITCH")) {
        enterPhase(room, "DAY_ANNOUNCEMENT");
      }
      break;
    }
    case "DAY_ANNOUNCEMENT": {
      clearTransitionTimeout(room);
      room.gameState.dayNumber += 1;
      const deaths = computeNightDeaths(room);
      for (const playerId of deaths) {
        const player = room.players.get(playerId);
        if (player) player.isAlive = false;
      }
      room.gameState.lastNightDeathPlayerIds = deaths;
      // Prefer the werewolves' actual kill as the anchor over a secondary poison death, since
      // it's the "main" death of the night; only fall back to the poison victim if the kill
      // target was saved.
      if (deaths.includes(room.gameState.nightKillTargetPlayerId ?? "")) {
        markLastRemoved(room, room.gameState.nightKillTargetPlayerId!);
      } else if (deaths.length > 0) {
        markLastRemoved(room, deaths[0]);
      }

      const winner = checkRoomWinner(room);
      if (winner) {
        room.gameState.winner = winner;
        enterPhase(room, "GAME_OVER");
        break;
      }
      scheduleDelayedTransition(room, 3000, "DAY_DISCUSSION");
      break;
    }
    case "DAY_DISCUSSION": {
      clearTransitionTimeout(room);
      room.gameState.dayVotes.clear();
      room.gameState.voteRound = 1;
      room.gameState.voteRunoffCandidateIds = null;
      room.gameState.discussionRemainingMsAtPause = null;
      room.gameState.discussionSpeakingOrder = computeSpeakingOrder(room);
      room.gameState.currentSpeakerIndex = 0;
      if (room.gameState.discussionSpeakingOrder.length === 0) {
        enterPhase(room, "DAY_VOTE");
        break;
      }
      startDiscussionTimer(room);
      break;
    }
    case "DAY_VOTE": {
      clearDiscussionTimer(room);
      clearTransitionTimeout(room);
      break;
    }
    case "DAY_EXILE_RESULT": {
      clearTransitionTimeout(room);
      const exiledPlayerId = room.gameState.exileResult?.exiledPlayerId ?? null;
      if (exiledPlayerId) {
        const player = room.players.get(exiledPlayerId);
        if (player) player.isAlive = false;
        markLastRemoved(room, exiledPlayerId);
      }

      const winner = checkRoomWinner(room);
      if (winner) {
        room.gameState.winner = winner;
        enterPhase(room, "GAME_OVER");
        break;
      }
      scheduleDelayedTransition(room, 3000, "NIGHT_START");
      break;
    }
    case "GAME_OVER": {
      clearDiscussionTimer(room);
      clearTransitionTimeout(room);
      break;
    }
    default:
      break;
  }
}
