import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from "../constants/room";

export interface PlayerNameValidationResult {
  isValid: boolean;
  normalizedName: string;
  error?: "EMPTY" | "TOO_LONG";
}

export function validatePlayerName(rawName: string): PlayerNameValidationResult {
  const normalizedName = rawName.trim();

  if (normalizedName.length < PLAYER_NAME_MIN_LENGTH) {
    return { isValid: false, normalizedName, error: "EMPTY" };
  }

  if (normalizedName.length > PLAYER_NAME_MAX_LENGTH) {
    return { isValid: false, normalizedName, error: "TOO_LONG" };
  }

  return { isValid: true, normalizedName };
}

export function isSameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
