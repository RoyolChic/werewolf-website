import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NIGHT_ACTION_SECONDS } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, endLastWords, hunterShoot, seerCheck, witchAction } from "../src/game/engine";
import { buildPrivateState } from "../src/game/privateState";
import {
  advanceThroughAnnouncementToDiscussion,
  confirmWerewolfKill,
  playersWithRole,
  setupNightReadyRoom,
  skipAllSpeakingTurns,
} from "./helpers";
import type { Room } from "../src/rooms/roomTypes";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

function killHunterAndReachAnnouncement(room: Room, hunterId: string): void {
  const wolves = playersWithRole(room, "WEREWOLF");
  confirmWerewolfKill(room, wolves, hunterId);
  const seerId = playersWithRole(room, "SEER")[0];
  const seerTarget = playersWithRole(room, "VILLAGER").find((id) => room.players.get(id)!.isAlive)!;
  seerCheck(room, seerId, seerTarget);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);
}

describe("hunter shoot", () => {
  it("lets the hunter shoot after dying to the werewolves (not poison)", () => {
    const { room } = setupNightReadyRoom(8, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    killHunterAndReachAnnouncement(room, hunterId);

    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.gameState.pendingHunterShooterPlayerId).toBe(hunterId);

    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("HUNTER_SHOOT");

    const shotTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[1];
    const result = hunterShoot(room, hunterId, shotTarget);
    expect(result.ok).toBe(true);
    expect(room.players.get(shotTarget)!.isAlive).toBe(false);
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
  });

  it("exposes HUNTER_SHOOT to the client even though the hunter is already dead by then", () => {
    const { room } = setupNightReadyRoom(8, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    killHunterAndReachAnnouncement(room, hunterId);
    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("HUNTER_SHOOT");
    expect(room.players.get(hunterId)!.isAlive).toBe(false);

    const privateState = buildPrivateState(room, hunterId)!;
    expect(privateState.availableActions).toContain("HUNTER_SHOOT");

    // A different dead player (if there were one) or an unrelated alive player must not get it.
    const someoneElse = playersWithRole(room, "VILLAGER").find((id) => room.players.get(id)!.isAlive)!;
    const otherPrivateState = buildPrivateState(room, someoneElse)!;
    expect(otherPrivateState.availableActions).not.toContain("HUNTER_SHOOT");
  });

  it("can decline to shoot", () => {
    const { room } = setupNightReadyRoom(8, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    killHunterAndReachAnnouncement(room, hunterId);
    vi.advanceTimersByTime(3000);

    const result = hunterShoot(room, hunterId, null);
    expect(result.ok).toBe(true);
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
    expect(room.gameState.pendingHunterShooterPlayerId).toBeNull();
  });

  it("defaults to not shooting if the hunter doesn't act in time", () => {
    const { room } = setupNightReadyRoom(8, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    killHunterAndReachAnnouncement(room, hunterId);
    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("HUNTER_SHOOT");

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 + 100);
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
    expect(room.gameState.pendingHunterShooterPlayerId).toBeNull();
  });

  it("rejects a shot from anyone other than the pending hunter", () => {
    const { room } = setupNightReadyRoom(8, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    killHunterAndReachAnnouncement(room, hunterId);
    vi.advanceTimersByTime(3000);

    const someoneElse = playersWithRole(room, "VILLAGER").find((id) => room.players.get(id)!.isAlive)!;
    const result = hunterShoot(room, someoneElse, hunterId);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
  });

  it("cannot shoot when killed by the witch's poison", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME", ["HUNTER"]);
    const hunterId = playersWithRole(room, "HUNTER")[0];
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playersWithRole(room, "VILLAGER");
    confirmWerewolfKill(room, wolves, villagers[0]);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, villagers[1]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "POISON", hunterId);

    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.gameState.pendingHunterShooterPlayerId).toBeNull();
    expect(room.players.get(hunterId)!.isAlive).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
  });

  it("lets an exiled hunter shoot before the game moves to night", () => {
    // A bigger room so shooting one more villager after the exile doesn't itself decide the
    // game -- this test is about the shoot-before-night sequencing, not the win check.
    const { room, playerIds } = setupNightReadyRoom(11, "FIRST_NIGHT_ONLY", ["HUNTER"]);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playersWithRole(room, "VILLAGER");
    confirmWerewolfKill(room, wolves, villagers[0]);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, villagers[1]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "SKIP", undefined);

    advanceThroughAnnouncementToDiscussion();
    skipAllSpeakingTurns(room);

    const hunterId = playersWithRole(room, "HUNTER")[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (const voter of alive) {
      dayVote(room, voter, voter === hunterId ? null : hunterId);
    }
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.pendingHunterShooterPlayerId).toBe(hunterId);
    expect(room.players.get(hunterId)!.isAlive).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("HUNTER_SHOOT");

    const shotTarget = playersWithRole(room, "VILLAGER").find(
      (id) => id !== hunterId && room.players.get(id)!.isAlive,
    )!;
    const result = hunterShoot(room, hunterId, shotTarget);
    expect(result.ok).toBe(true);
    expect(room.players.get(shotTarget)!.isAlive).toBe(false);

    // The exiled hunter still gets last words after shooting, same as any other exile, before
    // night actually falls.
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");
    expect(room.gameState.lastWordsPlayerId).toBe(hunterId);
    const endResult = endLastWords(room, hunterId);
    expect(endResult.ok).toBe(true);

    vi.advanceTimersByTime(1200); // NIGHT_START -> NIGHT_GUARD -> (no guard in this game) -> NIGHT_WEREWOLF
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
    expect(room.gameState.nightNumber).toBe(2);
  });
});
