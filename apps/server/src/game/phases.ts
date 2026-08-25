import type { GamePhase } from "@kill-wolf/shared";
import type { Player, Room } from "../rooms/roomTypes";
import { broadcastRoom } from "../rooms/roomBroadcast";
import { checkRoomWinner } from "./winConditions";
import {
  clearDiscussionTimer,
  clearLastWordsTimer,
  clearNightActionTimer,
  startDiscussionTimer,
  startLastWordsTimer,
  startNightActionTimer,
} from "./timers";
import { resolveWerewolfKillTarget } from "./engine";

export function aliveWerewolves(room: Room): Player[] {
  return [...room.players.values()].filter((p) => p.isAlive && p.role === "WEREWOLF");
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

interface NightDeathResult {
  deaths: string[];
  doubleProtected: boolean;
}

/**
 * A wolf-kill target survives if exactly one of {guard, witch} protected them; if both did
 * (guard protected the same person the witch also saved) or neither did, they die anyway --
 * the classic "同守同救" rule that keeps guard+witch from being an unbeatable combo. Also reports
 * whether that double-protection case is what actually happened, so the caller can surface it in
 * the log -- otherwise an antidote that "didn't work" looks indistinguishable from a bug.
 */
function computeNightDeaths(room: Room): NightDeathResult {
  const { gameState } = room;
  const deaths = new Set<string>();
  let doubleProtected = false;

  const killTargetId = gameState.nightKillTargetPlayerId;
  if (killTargetId) {
    const guarded = killTargetId === gameState.nightGuardedPlayerId;
    const saved = killTargetId === gameState.nightSavedPlayerId;
    if (guarded === saved) {
      deaths.add(killTargetId);
      doubleProtected = guarded && saved;
    }
  }
  if (gameState.nightPoisonedPlayerId) {
    deaths.add(gameState.nightPoisonedPlayerId);
  }
  return { deaths: [...deaths], doubleProtected };
}

export function markLastRemoved(room: Room, playerId: string): void {
  const seatIndex = room.playerOrder.indexOf(playerId);
  if (seatIndex !== -1) {
    room.gameState.lastRemovedSeatIndex = seatIndex;
  }
}

/**
 * A hunter can shoot when they die from anything except the witch's poison. `deaths` is the set
 * of playerIds who just died this night (from computeNightDeaths); at most one of them can be a
 * hunter since there's only ever one in a game.
 */
function findEligibleHunterFromNightDeaths(room: Room, deaths: string[]): string | null {
  for (const playerId of deaths) {
    if (playerId === room.gameState.nightPoisonedPlayerId) continue;
    if (room.players.get(playerId)?.role === "HUNTER") {
      return playerId;
    }
  }
  return null;
}

function findEligibleHunterFromExile(room: Room, exiledPlayerId: string): string | null {
  return room.players.get(exiledPlayerId)?.role === "HUNTER" ? exiledPlayerId : null;
}

/**
 * Resolves a pending hunter's shot (or their decision/timeout to not shoot), then resumes
 * whichever phase was interrupted to let them decide. Shared by the player-triggered action and
 * the action-timeout fallback.
 */
export function resolveHunterShoot(room: Room, targetPlayerId: string | null): void {
  if (targetPlayerId) {
    const target = room.players.get(targetPlayerId);
    if (target) {
      target.isAlive = false;
      markLastRemoved(room, targetPlayerId);
    }
  }
  room.gameState.pendingHunterShooterPlayerId = null;
  const nextPhase = room.gameState.hunterShootReturnPhase ?? "DAY_DISCUSSION";
  room.gameState.hunterShootReturnPhase = null;

  const winner = checkRoomWinner(room);
  if (winner) {
    room.gameState.winner = winner;
    enterPhase(room, "GAME_OVER");
    return;
  }
  enterPhase(room, nextPhase);
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

/**
 * Called when the last-words speaker's turn ends (their timer expired, or they ended it early).
 * There's only ever one speaker in this phase, so unlike day discussion this always moves
 * straight on to night.
 */
export function finishLastWords(room: Room): void {
  enterPhase(room, "NIGHT_START");
}

/**
 * Called when a night action's 60s clock runs out without everyone finishing. Forces the phase
 * forward using whatever was decided so far, exactly like the manual "everyone acted" path would.
 */
export function runNightActionTimeout(room: Room): void {
  switch (room.gameState.phase) {
    case "NIGHT_GUARD":
      enterPhase(room, "NIGHT_WEREWOLF");
      break;
    case "NIGHT_WEREWOLF":
      resolveWerewolfKillTarget(room);
      enterPhase(room, "NIGHT_SEER");
      break;
    case "NIGHT_SEER":
      enterPhase(room, "NIGHT_WITCH");
      break;
    case "NIGHT_WITCH":
      enterPhase(room, "DAY_ANNOUNCEMENT");
      break;
    case "HUNTER_SHOOT":
      resolveHunterShoot(room, null);
      break;
    default:
      break;
  }
}

export function enterPhase(room: Room, phase: GamePhase): void {
  room.gameState.phase = phase;

  switch (phase) {
    case "NIGHT_START": {
      // Defensive: a knight's duel can jump straight here from mid-DAY_DISCUSSION, which would
      // otherwise leave that discussion's timer pending to fire into the new night.
      clearDiscussionTimer(room);
      clearLastWordsTimer(room);
      room.gameState.nightNumber += 1;
      room.gameState.werewolfVotes.clear();
      room.gameState.werewolfConfirmedPlayerIds.clear();
      room.gameState.nightKillTargetPlayerId = null;
      room.gameState.nightSavedPlayerId = null;
      room.gameState.nightPoisonedPlayerId = null;
      room.gameState.lastGuardedPlayerId = room.gameState.nightGuardedPlayerId;
      room.gameState.nightGuardedPlayerId = null;
      room.gameState.witchActedTonight = false;
      room.gameState.lastNightDeathPlayerIds = null;
      room.gameState.exileResult = null;
      room.gameState.lastWordsPlayerId = null;
      room.gameState.lastWordsEndsAt = null;
      room.gameState.lastWordsRemainingMsAtPause = null;
      scheduleDelayedTransition(room, 1200, "NIGHT_GUARD");
      break;
    }
    case "NIGHT_GUARD": {
      // Whether this game has a guard at all is already public -- the lobby shows the full role
      // config to everyone before the game starts -- so there's nothing to hide by waiting out
      // the timer when nobody was dealt the card. Skip straight to NIGHT_WEREWOLF in that case.
      // If a guard *was* dealt in but has since died, still run the full timer: only their death
      // (not their existence) needs to stay hidden, otherwise an instant skip would reveal it.
      clearTransitionTimeout(room);
      clearNightActionTimer(room);
      const hasGuardInGame = [...room.players.values()].some((p) => p.role === "GUARD");
      if (!hasGuardInGame) {
        enterPhase(room, "NIGHT_WEREWOLF");
        break;
      }
      startNightActionTimer(room);
      break;
    }
    case "NIGHT_WEREWOLF": {
      clearTransitionTimeout(room);
      startNightActionTimer(room);
      break;
    }
    case "NIGHT_SEER": {
      // Always run the seer's full timer, even if the seer is dead -- otherwise this phase
      // would resolve instantly, and other players would learn the seer died before dawn just
      // from how fast the night moved.
      clearTransitionTimeout(room);
      clearNightActionTimer(room);
      startNightActionTimer(room);
      break;
    }
    case "NIGHT_WITCH": {
      // Same reasoning as NIGHT_SEER: always run the full timer so a dead witch doesn't leak
      // through a suspiciously instant phase transition.
      clearTransitionTimeout(room);
      clearNightActionTimer(room);
      startNightActionTimer(room);
      break;
    }
    case "DAY_ANNOUNCEMENT": {
      clearTransitionTimeout(room);
      clearNightActionTimer(room);
      room.gameState.dayNumber += 1;
      const { deaths, doubleProtected } = computeNightDeaths(room);
      for (const playerId of deaths) {
        const player = room.players.get(playerId);
        if (player) player.isAlive = false;
      }
      room.gameState.lastNightDeathPlayerIds = deaths;
      room.gameState.nightHistory.push({ night: room.gameState.nightNumber, deathPlayerIds: deaths, doubleProtected });
      // Prefer the werewolves' actual kill as the anchor over a secondary poison death, since
      // it's the "main" death of the night; only fall back to the poison victim if the kill
      // target was saved.
      if (deaths.includes(room.gameState.nightKillTargetPlayerId ?? "")) {
        markLastRemoved(room, room.gameState.nightKillTargetPlayerId!);
      } else if (deaths.length > 0) {
        markLastRemoved(room, deaths[0]);
      }

      // A hunter always gets to decide whether to shoot before the game checks for a winner --
      // their shot can itself flip an otherwise-decided outcome.
      const eligibleHunterId = findEligibleHunterFromNightDeaths(room, deaths);
      if (eligibleHunterId) {
        room.gameState.pendingHunterShooterPlayerId = eligibleHunterId;
        room.gameState.hunterShootReturnPhase = "DAY_DISCUSSION";
        scheduleDelayedTransition(room, 3000, "HUNTER_SHOOT");
        break;
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
    case "HUNTER_SHOOT": {
      clearTransitionTimeout(room);
      clearNightActionTimer(room);
      startNightActionTimer(room);
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
    case "DAY_TIEBREAK_DISCUSSION": {
      // Round 1 of the day vote tied -- give just the tied candidates one more turn each to
      // speak (in seat order) before the round-2 revote among them.
      clearTransitionTimeout(room);
      const candidateIds = room.gameState.voteRunoffCandidateIds ?? [];
      room.gameState.discussionRemainingMsAtPause = null;
      room.gameState.discussionSpeakingOrder = room.playerOrder.filter((id) => candidateIds.includes(id));
      room.gameState.currentSpeakerIndex = 0;
      if (room.gameState.discussionSpeakingOrder.length === 0) {
        enterPhase(room, "DAY_VOTE");
        break;
      }
      startDiscussionTimer(room);
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
      // Nobody to give last words to if the round ended in a tie/all-abstain -- go straight to
      // night in that case, same as before this existed. Set eagerly (even down the hunter-shoot
      // detour below) since DAY_LAST_WORDS reads it whenever it's eventually entered.
      const nightBoundPhase: GamePhase = exiledPlayerId ? "DAY_LAST_WORDS" : "NIGHT_START";
      room.gameState.lastWordsPlayerId = exiledPlayerId;

      const eligibleHunterId = exiledPlayerId ? findEligibleHunterFromExile(room, exiledPlayerId) : null;
      if (eligibleHunterId) {
        room.gameState.pendingHunterShooterPlayerId = eligibleHunterId;
        room.gameState.hunterShootReturnPhase = nightBoundPhase;
        scheduleDelayedTransition(room, 3000, "HUNTER_SHOOT");
        break;
      }

      const winner = checkRoomWinner(room);
      if (winner) {
        room.gameState.winner = winner;
        enterPhase(room, "GAME_OVER");
        break;
      }
      scheduleDelayedTransition(room, 3000, nightBoundPhase);
      break;
    }
    case "DAY_LAST_WORDS": {
      clearTransitionTimeout(room);
      if (!room.gameState.lastWordsPlayerId) {
        enterPhase(room, "NIGHT_START");
        break;
      }
      startLastWordsTimer(room);
      break;
    }
    case "GAME_OVER": {
      clearDiscussionTimer(room);
      clearNightActionTimer(room);
      clearTransitionTimeout(room);
      clearLastWordsTimer(room);
      break;
    }
    default:
      break;
  }
}
