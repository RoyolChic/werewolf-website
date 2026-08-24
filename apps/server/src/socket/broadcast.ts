import type { Server } from "socket.io";
import { SERVER_EVENTS } from "@kill-wolf/shared";
import type { Room } from "../rooms/roomTypes";
import { buildPublicRoomState } from "../game/publicState";
import { buildPrivateState } from "../game/privateState";

export function createBroadcaster(io: Server) {
  return function broadcastRoomState(room: Room): void {
    io.to(room.roomId).emit(SERVER_EVENTS.ROOM_STATE_UPDATED, buildPublicRoomState(room));

    for (const player of room.players.values()) {
      if (player.isConnected && player.socketId) {
        const privateState = buildPrivateState(room, player.playerId);
        if (privateState) {
          io.to(player.socketId).emit(SERVER_EVENTS.PRIVATE_STATE_UPDATED, privateState);
        }
      }
    }
  };
}
