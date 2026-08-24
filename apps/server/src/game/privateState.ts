import type { ActionType, PrivatePlayerState } from "@kill-wolf/shared";
import type { Player, Room } from "../rooms/roomTypes";

function computeAvailableActions(room: Room, player: Player): ActionType[] {
  const { gameState } = room;
  const { phase } = gameState;

  if (!player.isAlive && phase !== "CARD_PICKING" && phase !== "ROLE_REVEAL") {
    return [];
  }

  switch (phase) {
    case "CARD_PICKING":
      return player.cardIndex === null ? ["PICK_CARD", "CONFIRM_CARD"] : ["CANCEL_CARD"];
    case "ROLE_REVEAL":
      return gameState.roleConfirmedPlayerIds.has(player.playerId) ? [] : ["CONFIRM_ROLE"];
    case "NIGHT_WEREWOLF":
      if (player.role !== "WEREWOLF") return [];
      return gameState.werewolfVotes.has(player.playerId) ? [] : ["WEREWOLF_VOTE"];
    case "NIGHT_SEER": {
      if (player.role !== "SEER") return [];
      const hasChecked = gameState.seerChecks.some(
        (c) => c.night === gameState.nightNumber && c.seerPlayerId === player.playerId,
      );
      return hasChecked ? [] : ["SEER_CHECK"];
    }
    case "NIGHT_WITCH":
      if (player.role !== "WITCH") return [];
      return gameState.witchActedTonight ? [] : ["WITCH_ACTION"];
    case "DAY_DISCUSSION":
      return gameState.discussionSkipRequesterIds.has(player.playerId) ? [] : ["SKIP_DAY_DISCUSSION"];
    case "DAY_VOTE":
      return gameState.dayVotes.has(player.playerId) ? [] : ["DAY_VOTE"];
    default:
      return [];
  }
}

export function buildPrivateState(room: Room, playerId: string): PrivatePlayerState | null {
  const player = room.players.get(playerId);
  if (!player) {
    return null;
  }

  const { gameState } = room;

  const werewolfAllyPlayerIds =
    player.role === "WEREWOLF"
      ? [...room.players.values()]
          .filter((p) => p.role === "WEREWOLF" && p.playerId !== player.playerId)
          .map((p) => p.playerId)
      : null;

  const werewolfVotes =
    player.role === "WEREWOLF" && gameState.phase === "NIGHT_WEREWOLF"
      ? Object.fromEntries(gameState.werewolfVotes)
      : null;

  const seerChecks =
    player.role === "SEER"
      ? gameState.seerChecks
          .filter((c) => c.seerPlayerId === player.playerId)
          .map((c) => ({ night: c.night, targetPlayerId: c.targetPlayerId, faction: c.faction }))
      : null;

  const witch =
    player.role === "WITCH"
      ? {
          hasAntidote: gameState.witch.hasAntidote,
          hasPoison: gameState.witch.hasPoison,
          tonightKilledPlayerId: gameState.phase === "NIGHT_WITCH" ? gameState.nightKillTargetPlayerId : null,
        }
      : null;

  return {
    playerId: player.playerId,
    role: player.role,
    werewolfAllyPlayerIds,
    werewolfVotes,
    seerChecks,
    witch,
    deadViewMode: player.deadViewMode,
    availableActions: computeAvailableActions(room, player),
  };
}
