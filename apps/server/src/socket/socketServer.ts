import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { CLIENT_ORIGIN } from "../config/env";
import { setRoomBroadcaster } from "../rooms/roomBroadcast";
import { createBroadcaster } from "./broadcast";
import { startIdleSweep } from "../rooms/idleSweep";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { registerCardHandlers } from "./handlers/cardHandlers";
import { registerGameActionHandlers } from "./handlers/gameActionHandlers";
import { registerReconnectHandlers } from "./handlers/reconnectHandlers";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ["GET", "POST"],
    },
  });

  setRoomBroadcaster(createBroadcaster(io));
  startIdleSweep(io);

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
    registerCardHandlers(io, socket);
    registerGameActionHandlers(io, socket);
    registerReconnectHandlers(io, socket);
  });

  return io;
}
