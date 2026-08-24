import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS, SERVER_EVENTS, type ConfirmReconnectPayload } from "@kill-wolf/shared";
import { emitError } from "../helpers";
import { bindSocketToPlayer, getSocketBinding, unbindSocket } from "../socketSession";
import { getRoom, touchRoom } from "../../rooms/roomStore";
import { confirmReconnect, disconnectPlayerBySocketId } from "../../rooms/roomService";
import { broadcastRoom } from "../../rooms/roomBroadcast";

export function registerReconnectHandlers(_io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.CONFIRM_RECONNECT, (payload: ConfirmReconnectPayload) => {
    if (typeof payload?.roomId !== "string" || typeof payload?.name !== "string") {
      emitError(socket, "INVALID_PAYLOAD", "缺少必要欄位");
      return;
    }

    const result = confirmReconnect(payload.roomId, payload.name, socket.id);
    if (!result.ok) {
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

  socket.on("disconnect", () => {
    const binding = getSocketBinding(socket.id);
    unbindSocket(socket.id);
    if (!binding) return;

    const room = getRoom(binding.roomId);
    if (!room) return;

    disconnectPlayerBySocketId(socket.id, room);
    touchRoom(room);
    broadcastRoom(room);
  });
}
