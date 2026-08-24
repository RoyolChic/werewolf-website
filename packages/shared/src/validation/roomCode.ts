import { ROOM_ID_LENGTH } from "../constants/room";

const ROOM_ID_PATTERN = new RegExp(`^[A-Z0-9]{${ROOM_ID_LENGTH}}$`);

export function isValidRoomId(value: string): boolean {
  return ROOM_ID_PATTERN.test(value);
}

export function normalizeRoomId(value: string): string {
  return value.trim().toUpperCase();
}
