import { evaluateWinner, type Faction } from "@kill-wolf/shared";
import type { Room } from "../rooms/roomTypes";

export function checkRoomWinner(room: Room): Faction | null {
  const alivePlayers = [...room.players.values()]
    .filter((p) => p.isAlive && p.role)
    .map((p) => ({ role: p.role! }));
  return evaluateWinner(alivePlayers);
}
