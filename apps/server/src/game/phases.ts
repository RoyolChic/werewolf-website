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
      room.gameState.discussionSkipRequesterIds.clear();
      room.gameState.dayVotes.clear();
      room.gameState.voteRound = 1;
      room.gameState.voteRunoffCandidateIds = null;
      room.gameState.discussionRemainingMsAtPause = null;
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
