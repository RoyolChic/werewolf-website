import { randomInt, randomUUID } from "node:crypto";

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }
  return items[randomInt(items.length)];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createToken(): string {
  return randomUUID();
}
