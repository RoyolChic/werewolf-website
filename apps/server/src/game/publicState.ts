import {
  LAST_WORDS_SECONDS,
  NIGHT_ACTION_SECONDS,
  type CardPublicState,
  type PlayerPublicState,
  type PublicRoomState,
  type Role,
} from "@kill-wolf/shared";
import type { Room } from "../rooms/roomTypes";

function buildPlayersPublicState(room: Room): PlayerPublicState[] {
  return room.playerOrder
    .map((playerId) => room.players.get(playerId))
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      isHost: player.playerId === room.hostPlayerId,
      isConnected: player.isConnected,
      isAlive: player.isAlive,
      hasPickedCard: player.cardIndex !== null,
    }));
}

function buildCardsPublicState(room: Room): CardPublicState[] {
  return room.cards.map((card) => ({
    cardIndex: card.cardIndex,
    isLocked: card.isLocked,
    lockedByPlayerId: card.lockedByPlayerId,
    hoveringCount: card.hoveringPlayerIds.size,
  }));
}

function buildRevealedRoles(room: Room): Record<string, Role> | null {
  const revealed: Record<string, Role> = {};
  if (room.gameState.phase === "GAME_OVER") {
    for (const player of room.players.values()) {
      if (player.role) {
        revealed[player.playerId] = player.role;
      }
    }
  } else {
    // Mid-game reveals, e.g. a knight who has dueled -- their identity is public from that
    // point on, well before GAME_OVER reveals everyone else's.
    for (const playerId of room.gameState.revealedPlayerIds) {
      const role = room.players.get(playerId)?.role;
      if (role) {
        revealed[playerId] = role;
      }
    }
  }
  return Object.keys(revealed).length > 0 ? revealed : null;
}

const DISCUSSION_PHASES: PublicRoomState["phase"][] = ["DAY_DISCUSSION", "DAY_TIEBREAK_DISCUSSION"];

function computeDiscussionSecondsRemaining(room: Room): number | null {
  const { gameState } = room;
  if (!DISCUSSION_PHASES.includes(gameState.phase)) {
    return null;
  }
  if (gameState.discussionEndsAt === null) {
    return gameState.discussionRemainingMsAtPause !== null
      ? Math.ceil(gameState.discussionRemainingMsAtPause / 1000)
      : room.dayDiscussionSeconds;
  }
  return Math.max(0, Math.ceil((gameState.discussionEndsAt - Date.now()) / 1000));
}

function computeDiscussionEndsAt(room: Room): number | null {
  const { gameState } = room;
  if (!DISCUSSION_PHASES.includes(gameState.phase)) {
    return null;
  }
  return gameState.discussionEndsAt;
}

const NIGHT_ACTION_PHASES: PublicRoomState["phase"][] = [
  "NIGHT_GUARD",
  "NIGHT_WEREWOLF",
  "NIGHT_SEER",
  "NIGHT_WITCH",
  "HUNTER_SHOOT",
];

function computeNightActionSecondsRemaining(room: Room): number | null {
  const { gameState } = room;
  if (!NIGHT_ACTION_PHASES.includes(gameState.phase)) {
    return null;
  }
  if (gameState.nightActionEndsAt === null) {
    return gameState.nightActionRemainingMsAtPause !== null
      ? Math.ceil(gameState.nightActionRemainingMsAtPause / 1000)
      : NIGHT_ACTION_SECONDS;
  }
  return Math.max(0, Math.ceil((gameState.nightActionEndsAt - Date.now()) / 1000));
}

function computeNightActionEndsAt(room: Room): number | null {
  const { gameState } = room;
  if (!NIGHT_ACTION_PHASES.includes(gameState.phase)) {
    return null;
  }
  return gameState.nightActionEndsAt;
}

function computeLastWordsSecondsRemaining(room: Room): number | null {
  const { gameState } = room;
  if (gameState.phase !== "DAY_LAST_WORDS") {
    return null;
  }
  if (gameState.lastWordsEndsAt === null) {
    return gameState.lastWordsRemainingMsAtPause !== null
      ? Math.ceil(gameState.lastWordsRemainingMsAtPause / 1000)
      : LAST_WORDS_SECONDS;
  }
  return Math.max(0, Math.ceil((gameState.lastWordsEndsAt - Date.now()) / 1000));
}

function computeLastWordsEndsAt(room: Room): number | null {
  const { gameState } = room;
  if (gameState.phase !== "DAY_LAST_WORDS") {
    return null;
  }
  return gameState.lastWordsEndsAt;
}

export function buildPublicRoomState(room: Room): PublicRoomState {
  const disconnectedPlayerIds = [...room.players.values()]
    .filter((p) => !p.isConnected)
    .map((p) => p.playerId);

  const pauseRelevantPhases: PublicRoomState["phase"][] = [
    "NIGHT_START",
    "NIGHT_GUARD",
    "NIGHT_WEREWOLF",
    "NIGHT_SEER",
    "NIGHT_WITCH",
    "DAY_ANNOUNCEMENT",
    "HUNTER_SHOOT",
    "DAY_DISCUSSION",
    "DAY_VOTE",
    "DAY_TIEBREAK_DISCUSSION",
    "DAY_EXILE_RESULT",
    "DAY_LAST_WORDS",
  ];
  const isPaused =
    pauseRelevantPhases.includes(room.gameState.phase) &&
    [...room.players.values()].some((p) => p.isAlive && !p.isConnected);

  return {
    roomId: room.roomId,
    phase: room.gameState.phase,
    maxPlayers: room.maxPlayers,
    roleCounts: room.roleCounts,
    dayDiscussionSeconds: room.dayDiscussionSeconds,
    witchSelfSaveRule: room.witchSelfSaveRule,
    hostPlayerId: room.hostPlayerId,
    players: buildPlayersPublicState(room),
    cards: buildCardsPublicState(room),
    dayNumber: room.gameState.dayNumber,
    nightNumber: room.gameState.nightNumber,
    discussionSecondsRemaining: computeDiscussionSecondsRemaining(room),
    discussionEndsAt: computeDiscussionEndsAt(room),
    nightActionSecondsRemaining: computeNightActionSecondsRemaining(room),
    nightActionEndsAt: computeNightActionEndsAt(room),
    discussionSpeakingOrder: DISCUSSION_PHASES.includes(room.gameState.phase) ? room.gameState.discussionSpeakingOrder : [],
    currentSpeakerPlayerId: DISCUSSION_PHASES.includes(room.gameState.phase)
      ? room.gameState.discussionSpeakingOrder[room.gameState.currentSpeakerIndex] ?? null
      : null,
    lastWordsPlayerId: room.gameState.phase === "DAY_LAST_WORDS" ? room.gameState.lastWordsPlayerId : null,
    lastWordsSecondsRemaining: computeLastWordsSecondsRemaining(room),
    lastWordsEndsAt: computeLastWordsEndsAt(room),
    lastNightDeathPlayerIds: room.gameState.lastNightDeathPlayerIds,
    pendingHunterShooterPlayerId: room.gameState.pendingHunterShooterPlayerId,
    exileResult: room.gameState.exileResult,
    nightHistory: room.gameState.nightHistory,
    voteHistory: room.gameState.voteHistory,
    winner: room.gameState.winner,
    isPaused,
    disconnectedPlayerIds,
    revealedRoles: buildRevealedRoles(room),
  };
}
