import type { CardPublicState, PlayerPublicState, PublicRoomState, Role } from "@kill-wolf/shared";
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
  if (room.gameState.phase !== "GAME_OVER") {
    return null;
  }
  const revealed: Record<string, Role> = {};
  for (const player of room.players.values()) {
    if (player.role) {
      revealed[player.playerId] = player.role;
    }
  }
  return revealed;
}

function computeDiscussionSecondsRemaining(room: Room): number | null {
  const { gameState } = room;
  if (gameState.phase !== "DAY_DISCUSSION") {
    return null;
  }
  if (gameState.discussionEndsAt === null) {
    return gameState.discussionRemainingMsAtPause !== null
      ? Math.ceil(gameState.discussionRemainingMsAtPause / 1000)
      : room.dayDiscussionSeconds;
  }
  return Math.max(0, Math.ceil((gameState.discussionEndsAt - Date.now()) / 1000));
}

export function buildPublicRoomState(room: Room): PublicRoomState {
  const disconnectedPlayerIds = [...room.players.values()]
    .filter((p) => !p.isConnected)
    .map((p) => p.playerId);

  const pauseRelevantPhases: PublicRoomState["phase"][] = [
    "NIGHT_START",
    "NIGHT_WEREWOLF",
    "NIGHT_SEER",
    "NIGHT_WITCH",
    "DAY_ANNOUNCEMENT",
    "DAY_DISCUSSION",
    "DAY_VOTE",
    "DAY_EXILE_RESULT",
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
    discussionSkipRequesterIds: [...room.gameState.discussionSkipRequesterIds],
    lastNightDeathPlayerIds: room.gameState.lastNightDeathPlayerIds,
    exileResult: room.gameState.exileResult,
    winner: room.gameState.winner,
    isPaused,
    disconnectedPlayerIds,
    revealedRoles: buildRevealedRoles(room),
  };
}
