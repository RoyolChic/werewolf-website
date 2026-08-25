import type { Server, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  type DayVotePayload,
  type EndLastWordsPayload,
  type GuardProtectPayload,
  type HunterShootPayload,
  type KnightDuelPayload,
  type SeerCheckPayload,
  type SkipDayDiscussionPayload,
  type WerewolfConfirmVotePayload,
  type WerewolfUnconfirmVotePayload,
  type WerewolfVotePayload,
  type WitchActionPayload,
} from "@kill-wolf/shared";
import { emitError, withRoomAndPlayer } from "../helpers";
import {
  dayVote,
  endLastWords,
  guardProtect,
  hunterShoot,
  knightDuel,
  seerCheck,
  skipDayDiscussion,
  werewolfConfirmVote,
  werewolfUnconfirmVote,
  werewolfVote,
  witchAction,
} from "../../game/engine";

export function registerGameActionHandlers(_io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.WEREWOLF_VOTE, (payload: WerewolfVotePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = werewolfVote(room, player.playerId, payload?.targetPlayerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.WEREWOLF_CONFIRM_VOTE, (payload: WerewolfConfirmVotePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = werewolfConfirmVote(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.WEREWOLF_UNCONFIRM_VOTE, (payload: WerewolfUnconfirmVotePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = werewolfUnconfirmVote(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.SEER_CHECK, (payload: SeerCheckPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = seerCheck(room, player.playerId, payload?.targetPlayerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.WITCH_ACTION, (payload: WitchActionPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = witchAction(room, player.playerId, payload?.action, payload?.targetPlayerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.GUARD_PROTECT, (payload: GuardProtectPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = guardProtect(room, player.playerId, payload?.targetPlayerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.HUNTER_SHOOT, (payload: HunterShootPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = hunterShoot(room, player.playerId, payload?.targetPlayerId ?? null);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.KNIGHT_DUEL, (payload: KnightDuelPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = knightDuel(room, player.playerId, payload?.targetPlayerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.DAY_VOTE, (payload: DayVotePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = dayVote(room, player.playerId, payload?.targetPlayerId ?? null);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.SKIP_DAY_DISCUSSION, (payload: SkipDayDiscussionPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = skipDayDiscussion(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.END_LAST_WORDS, (payload: EndLastWordsPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = endLastWords(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });
}
