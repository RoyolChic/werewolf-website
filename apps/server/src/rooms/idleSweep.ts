import type { Server } from "socket.io";
import { ACTIVE_ROOM_IDLE_TIMEOUT_MS, GAME_OVER_IDLE_TIMEOUT_MS, IDLE_SWEEP_INTERVAL_MS, SERVER_EVENTS } from "@kill-wolf/shared";
import { deleteRoom, getAllRooms } from "./roomStore";

export function startIdleSweep(io: Server): NodeJS.Timeout {
  return setInterval(() => {
    const now = Date.now();
    for (const room of getAllRooms()) {
      const idleMs = now - room.lastActivityAt;
      const timeoutMs = room.gameState.phase === "GAME_OVER" ? GAME_OVER_IDLE_TIMEOUT_MS : ACTIVE_ROOM_IDLE_TIMEOUT_MS;

      if (idleMs >= timeoutMs) {
        io.to(room.roomId).emit(SERVER_EVENTS.ROOM_CLOSED, { roomId: room.roomId, reason: "IDLE_TIMEOUT" });
        deleteRoom(room.roomId);
      }
    }
  }, IDLE_SWEEP_INTERVAL_MS);
}
