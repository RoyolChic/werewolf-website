export function buildRoomUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}`;
}
