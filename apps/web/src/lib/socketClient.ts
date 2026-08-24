import { io, type Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true });
  }
  return socket;
}

/**
 * Opens a brand-new, independent connection (its own socket.id) instead of reusing the shared
 * singleton. Used by the dev multi-view tool to simulate several distinct players in one tab.
 */
export function createIsolatedSocket(): Socket {
  return io(SERVER_URL, { forceNew: true, autoConnect: true });
}
