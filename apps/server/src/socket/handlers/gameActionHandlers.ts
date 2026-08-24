import type { Server, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  type DayVotePayload,
  type SeerCheckPayload,
  type SkipDayDiscussionPayload,
  type WerewolfVotePayload,
  type WitchActionPayload,
} from "@kill-wolf/shared";
import { emitError, withRoomAndPlayer } from "../helpers";
import { dayVote, seerCheck, skipDayDiscussion, werewolfVote, witchAction } from "../../game/engine";

export function registerGameActionHandlers(_io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.WEREWOLF_VOTE, (payload: WerewolfVotePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = werewolfVote(room, player.playerId, payload?.targetPlayerId);
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
}
