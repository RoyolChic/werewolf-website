import type { ActionType, PrivatePlayerState, Role } from "@kill-wolf/shared";
import type { Player, Room } from "../rooms/roomTypes";

/** The knight's once-per-game duel can be declared any time during the day, independent of
 * whatever else is happening (speaking turn, voting), so it's appended after the phase switch
 * below rather than being one more case inside it. */
const KNIGHT_DUEL_PHASES = new Set(["DAY_DISCUSSION", "DAY_TIEBREAK_DISCUSSION", "DAY_VOTE"]);

function computeAvailableActions(room: Room, player: Player): ActionType[] {
  const { gameState } = room;
  const { phase } = gameState;

  // A hunter is already dead by the time HUNTER_SHOOT starts (that's what makes them eligible
  // to shoot in the first place), and the last-words speaker is dead too (just exiled) -- so the
  // general "dead players get no actions" gate has to make an exception for both. The cases below
  // still only grant the action to whoever gameState actually names.
  if (
    !player.isAlive &&
    phase !== "CARD_PICKING" &&
    phase !== "ROLE_REVEAL" &&
    phase !== "HUNTER_SHOOT" &&
    phase !== "DAY_LAST_WORDS"
  ) {
    return [];
  }

  const actions: ActionType[] = [];

  switch (phase) {
    case "CARD_PICKING":
      return player.cardIndex === null ? ["PICK_CARD", "CONFIRM_CARD"] : ["CANCEL_CARD"];
    case "ROLE_REVEAL":
      return gameState.roleConfirmedPlayerIds.has(player.playerId) ? [] : ["CONFIRM_ROLE"];
    case "NIGHT_GUARD": {
      if (player.role === "GUARD" && gameState.nightGuardedPlayerId === null) {
        actions.push("GUARD_PROTECT");
      }
      break;
    }
    case "NIGHT_WEREWOLF": {
      if (player.role !== "WEREWOLF") break;
      if (gameState.werewolfConfirmedPlayerIds.has(player.playerId)) {
        actions.push("WEREWOLF_UNCONFIRM_VOTE");
      } else {
        actions.push("WEREWOLF_VOTE");
        if (gameState.werewolfVotes.has(player.playerId)) {
          actions.push("WEREWOLF_CONFIRM_VOTE");
        }
      }
      break;
    }
    case "NIGHT_SEER": {
      if (player.role !== "SEER") break;
      const hasChecked = gameState.seerChecks.some(
        (c) => c.night === gameState.nightNumber && c.seerPlayerId === player.playerId,
      );
      if (!hasChecked) actions.push("SEER_CHECK");
      break;
    }
    case "NIGHT_WITCH":
      if (player.role === "WITCH" && !gameState.witchActedTonight) {
        actions.push("WITCH_ACTION");
      }
      break;
    case "HUNTER_SHOOT": {
      if (gameState.pendingHunterShooterPlayerId === player.playerId) {
        actions.push("HUNTER_SHOOT");
      }
      break;
    }
    case "DAY_DISCUSSION":
    case "DAY_TIEBREAK_DISCUSSION":
      if (gameState.discussionSpeakingOrder[gameState.currentSpeakerIndex] === player.playerId) {
        actions.push("SKIP_DAY_DISCUSSION");
      }
      break;
    case "DAY_VOTE":
      if (!gameState.dayVotes.has(player.playerId)) {
        actions.push("DAY_VOTE");
      }
      break;
    case "DAY_LAST_WORDS":
      if (gameState.lastWordsPlayerId === player.playerId) {
        actions.push("END_LAST_WORDS");
      }
      break;
    default:
      break;
  }

  if (
    player.role === "KNIGHT" &&
    player.isAlive &&
    !gameState.knightDuelUsed &&
    KNIGHT_DUEL_PHASES.has(phase)
  ) {
    actions.push("KNIGHT_DUEL");
  }

  return actions;
}

/**
 * Werewolf/villager card art comes in several variants (see getRoleImagePath); this picks each
 * player's slot by their fixed seat position among only the other players who share their role,
 * so it's stable for the whole game and doesn't depend on who's still alive.
 */
function computeRoleImageVariantIndex(room: Room, player: Player): number {
  if (!player.role) return 0;
  const seatOrderWithSameRole = room.playerOrder.filter((id) => room.players.get(id)?.role === player.role);
  const index = seatOrderWithSameRole.indexOf(player.playerId);
  return index === -1 ? 0 : index;
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

  const werewolfConfirmedPlayerIds =
    player.role === "WEREWOLF" && gameState.phase === "NIGHT_WEREWOLF"
      ? [...gameState.werewolfConfirmedPlayerIds]
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
          // Who the wolves killed is only revealed once she actually has an antidote decision to
          // make about them -- without one left, she stays blind to the victim (the poison can be
          // used on anyone regardless), so this is withheld at the source rather than just hidden
          // in the UI.
          tonightKilledPlayerId:
            gameState.phase === "NIGHT_WITCH" && gameState.witch.hasAntidote ? gameState.nightKillTargetPlayerId : null,
        }
      : null;

  const guard =
    player.role === "GUARD"
      ? {
          lastProtectedPlayerId: gameState.lastGuardedPlayerId,
        }
      : null;

  const knight =
    player.role === "KNIGHT"
      ? {
          duelUsed: gameState.knightDuelUsed,
        }
      : null;

  const spectatorRevealedRoles =
    !player.isAlive && player.deadViewMode === "FULL"
      ? Object.fromEntries(
          [...room.players.values()]
            .filter((p): p is Player & { role: Role } => p.role !== null)
            .map((p) => [p.playerId, p.role]),
        )
      : null;

  return {
    playerId: player.playerId,
    role: player.role,
    roleImageVariantIndex: computeRoleImageVariantIndex(room, player),
    werewolfAllyPlayerIds,
    werewolfVotes,
    werewolfConfirmedPlayerIds,
    seerChecks,
    witch,
    guard,
    knight,
    deadViewMode: player.deadViewMode,
    spectatorRevealedRoles,
    availableActions: computeAvailableActions(room, player),
  };
}
