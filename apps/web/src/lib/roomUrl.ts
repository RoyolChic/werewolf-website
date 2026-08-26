import { withBase } from "./assetPath";

export function buildRoomUrl(roomId: string): string {
  return `${window.location.origin}${withBase(`/room/${roomId}`)}`;
}
