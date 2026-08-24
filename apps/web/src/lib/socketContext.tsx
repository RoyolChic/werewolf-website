import { createContext, useContext, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "./socketClient";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ socket, children }: { socket: Socket; children: ReactNode }) {
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

/**
 * Returns the socket to use for emitting actions: the one provided by a surrounding
 * SocketProvider if present (e.g. one simulated player inside DevMultiViewPage), otherwise the
 * app-wide singleton used by real players.
 */
export function useSocket(): Socket {
  const provided = useContext(SocketContext);
  return provided ?? getSocket();
}
