import type { Socket } from "socket.io";
import { SERVER_EVENTS } from "@kill-wolf/shared";
import { getRoom, touchRoom } from "../rooms/roomStore";
import { broadcastRoom } from "../rooms/roomBroadcast";
import { getSocketBinding } from "./socketSession";
import type { Player, Room } from "../rooms/roomTypes";

export function emitError(socket: Socket, code: string, message: string): void {
  socket.emit(SERVER_EVENTS.ERROR, { code, message });
}

export function withRoomAndPlayer(
  socket: Socket,
  roomId: unknown,
  handler: (room: Room, player: Player) => void,
): void {
  if (typeof roomId !== "string") {
    emitError(socket, "INVALID_PAYLOAD", "roomId 格式錯誤");
    return;
  }
  const binding = getSocketBinding(socket.id);
  if (!binding || binding.roomId !== roomId) {
    emitError(socket, "NOT_IN_ROOM", "尚未加入此房間");
    return;
  }
  const room = getRoom(roomId);
  if (!room) {
    emitError(socket, "ROOM_NOT_FOUND", "房間不存在");
    return;
  }
  const player = room.players.get(binding.playerId);
  if (!player) {
    emitError(socket, "PLAYER_NOT_FOUND", "找不到玩家");
    return;
  }

  touchRoom(room);
  handler(room, player);
  broadcastRoom(room);
}
