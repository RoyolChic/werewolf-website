import type { Server, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  WITCH_SELF_SAVE_RULES,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type KickPlayerPayload,
  type LeaveRoomPayload,
  type RequestRoomStatePayload,
  type SetDayDiscussionSecondsPayload,
  type SetDeadViewModePayload,
  type SetMaxPlayersPayload,
  type SetWitchSelfSaveRulePayload,
  type StartCardPickingPayload,
} from "@kill-wolf/shared";
import { emitError, withRoomAndPlayer } from "../helpers";
import { bindSocketToPlayer } from "../socketSession";
import { broadcastRoom } from "../../rooms/roomBroadcast";
import { touchRoom } from "../../rooms/roomStore";
import * as roomService from "../../rooms/roomService";
import { startCardPicking as engineStartCardPicking } from "../../game/engine";
import { RateLimiter } from "../../utils/rateLimiter";

const createRoomLimiter = new RateLimiter(5, 10_000);
const joinRoomLimiter = new RateLimiter(10, 10_000);

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.CREATE_ROOM, (payload: CreateRoomPayload) => {
    if (!createRoomLimiter.tryConsume(socket.handshake.address)) {
      emitError(socket, "RATE_LIMITED", "操作過於頻繁，請稍後再試");
      return;
    }
    if (typeof payload?.maxPlayers !== "number" || typeof payload?.hostName !== "string") {
      emitError(socket, "INVALID_PAYLOAD", "缺少必要欄位");
      return;
    }
    const result = roomService.createRoomAndJoin({
      maxPlayers: payload.maxPlayers,
      dayDiscussionSeconds: Number(payload.dayDiscussionSeconds),
      witchSelfSaveRule: payload.witchSelfSaveRule,
      hostName: payload.hostName,
      socketId: socket.id,
    });

    if (!result.ok) {
      emitError(socket, result.code, result.message);
      return;
    }

    socket.join(result.room.roomId);
    bindSocketToPlayer(socket.id, result.room.roomId, result.player.playerId);

    socket.emit(SERVER_EVENTS.ROOM_CREATED, {
      roomId: result.room.roomId,
      playerId: result.player.playerId,
      reconnectToken: result.player.reconnectToken,
    });
    broadcastRoom(result.room);
  });

  socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
    if (!joinRoomLimiter.tryConsume(socket.handshake.address)) {
      emitError(socket, "RATE_LIMITED", "操作過於頻繁，請稍後再試");
      return;
    }
    if (typeof payload?.roomId !== "string" || typeof payload?.name !== "string") {
      emitError(socket, "INVALID_PAYLOAD", "缺少必要欄位");
      return;
    }

    const result = roomService.joinRoom({
      roomId: payload.roomId,
      name: payload.name,
      reconnectToken: payload.reconnectToken,
      socketId: socket.id,
    });

    if (!result.ok) {
      if (result.code === "RECONNECT_CONFIRMATION_REQUIRED") {
        socket.emit(SERVER_EVENTS.RECONNECT_CONFIRMATION_REQUIRED, { roomId: payload.roomId, name: payload.name });
        return;
      }
      emitError(socket, result.code, result.message);
      return;
    }

    socket.join(result.room.roomId);
    bindSocketToPlayer(socket.id, result.room.roomId, result.player.playerId);
    touchRoom(result.room);

    socket.emit(SERVER_EVENTS.ROOM_JOINED, {
      roomId: result.room.roomId,
      playerId: result.player.playerId,
      reconnectToken: result.player.reconnectToken,
    });
    broadcastRoom(result.room);
  });

  socket.on(CLIENT_EVENTS.LEAVE_ROOM, (payload: LeaveRoomPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = roomService.leaveRoom(room, player.playerId);
      if (!result.ok) {
        emitError(socket, result.code, result.message);
        return;
      }
      socket.leave(room.roomId);
    });
  });

  socket.on(CLIENT_EVENTS.KICK_PLAYER, (payload: KickPlayerPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      if (typeof payload?.targetPlayerId !== "string") {
        emitError(socket, "INVALID_PAYLOAD", "缺少必要欄位");
        return;
      }
      const targetSocketId = room.players.get(payload.targetPlayerId)?.socketId;
      const result = roomService.kickPlayer(room, player.playerId, payload.targetPlayerId);
      if (!result.ok) {
        emitError(socket, result.code, result.message);
        return;
      }
      if (targetSocketId) {
        io.to(targetSocketId).emit(SERVER_EVENTS.PLAYER_KICKED, { roomId: room.roomId, playerId: payload.targetPlayerId });
        io.sockets.sockets.get(targetSocketId)?.leave(room.roomId);
      }
    });
  });

  socket.on(CLIENT_EVENTS.REQUEST_ROOM_STATE, (payload: RequestRoomStatePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, () => {
      // broadcastRoom is called automatically by withRoomAndPlayer after the handler runs.
    });
  });

  socket.on(CLIENT_EVENTS.SET_MAX_PLAYERS, (payload: SetMaxPlayersPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = roomService.setMaxPlayers(room, player.playerId, Number(payload?.maxPlayers));
      if (!result.ok) emitError(socket, result.code, result.message);
    });
  });

  socket.on(CLIENT_EVENTS.SET_DAY_DISCUSSION_SECONDS, (payload: SetDayDiscussionSecondsPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = roomService.setDayDiscussionSeconds(room, player.playerId, Number(payload?.seconds));
      if (!result.ok) emitError(socket, result.code, result.message);
    });
  });

  socket.on(CLIENT_EVENTS.SET_WITCH_SELF_SAVE_RULE, (payload: SetWitchSelfSaveRulePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      if (!WITCH_SELF_SAVE_RULES.includes(payload?.rule as any)) {
        emitError(socket, "INVALID_RULE", "不合法的女巫自救規則");
        return;
      }
      const result = roomService.setWitchSelfSaveRule(room, player.playerId, payload.rule);
      if (!result.ok) emitError(socket, result.code, result.message);
    });
  });

  socket.on(CLIENT_EVENTS.SET_DEAD_VIEW_MODE, (payload: SetDeadViewModePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = roomService.setDeadViewMode(room, player.playerId, payload?.mode);
      if (!result.ok) emitError(socket, result.code, result.message);
    });
  });

  socket.on(CLIENT_EVENTS.START_CARD_PICKING, (payload: StartCardPickingPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = engineStartCardPicking(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });
}
