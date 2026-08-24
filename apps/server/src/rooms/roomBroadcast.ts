import type { Room } from "./roomTypes";

type Broadcaster = (room: Room) => void;

let broadcaster: Broadcaster | null = null;

export function setRoomBroadcaster(fn: Broadcaster): void {
  broadcaster = fn;
}

export function broadcastRoom(room: Room): void {
  broadcaster?.(room);
}
