import { io, type Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true });
  }
  return socket;
}
