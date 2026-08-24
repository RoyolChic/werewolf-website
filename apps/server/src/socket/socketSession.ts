interface Binding {
  roomId: string;
  playerId: string;
}

const socketToPlayer = new Map<string, Binding>();

export function bindSocketToPlayer(socketId: string, roomId: string, playerId: string): void {
  socketToPlayer.set(socketId, { roomId, playerId });
}

export function unbindSocket(socketId: string): void {
  socketToPlayer.delete(socketId);
}

export function getSocketBinding(socketId: string): Binding | undefined {
  return socketToPlayer.get(socketId);
}
