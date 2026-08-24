import { randomInt } from "node:crypto";
import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from "@kill-wolf/shared";

export function createRoomId(): string {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i += 1) {
    id += ROOM_ID_ALPHABET[randomInt(ROOM_ID_ALPHABET.length)];
  }
  return id;
}
