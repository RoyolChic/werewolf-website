import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NIGHT_ACTION_SECONDS } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { seerCheck } from "../src/game/engine";
import { confirmWerewolfKill, playersWithRole, setupNightReadyRoom } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

function advanceToSeerPhase(room: ReturnType<typeof setupNightReadyRoom>["room"]) {
  const wolves = playersWithRole(room, "WEREWOLF");
  const target = [...room.players.keys()].find((id) => !wolves.includes(id))!;
  confirmWerewolfKill(room, wolves, target);
}

describe("seer night phase", () => {
  it("only allows the seer to act, and only during NIGHT_SEER", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const seerId = playersWithRole(room, "SEER")[0];
    const someoneElse = playerIds.find((id) => id !== seerId)!;

    const wrongPhase = seerCheck(room, seerId, someoneElse);
    expect(wrongPhase.ok).toBe(false);
    expect(wrongPhase.code).toBe("INVALID_PHASE");

    advanceToSeerPhase(room);
    expect(room.gameState.phase).toBe("NIGHT_SEER");

    const notSeer = playersWithRole(room, "VILLAGER")[0];
    const forbidden = seerCheck(room, notSeer, someoneElse);
    expect(forbidden.ok).toBe(false);
    expect(forbidden.code).toBe("FORBIDDEN");
  });

  it("reports the correct faction and cannot check a dead player", () => {
    const { room } = setupNightReadyRoom(6);
    advanceToSeerPhase(room);
    const seerId = playersWithRole(room, "SEER")[0];
    const wolfId = playersWithRole(room, "WEREWOLF")[0];
    const villagerId = playersWithRole(room, "VILLAGER")[0];

    room.players.get(villagerId)!.isAlive = false;
    const deadCheck = seerCheck(room, seerId, villagerId);
    expect(deadCheck.ok).toBe(false);
    expect(deadCheck.code).toBe("INVALID_TARGET");

    const result = seerCheck(room, seerId, wolfId);
    expect(result.ok).toBe(true);
    expect(room.gameState.seerChecks.at(-1)?.faction).toBe("WEREWOLF");
    expect(room.gameState.phase).toBe("NIGHT_WITCH");
  });

  it("only allows one check per night", () => {
    const { room } = setupNightReadyRoom(8);
    advanceToSeerPhase(room);
    const seerId = playersWithRole(room, "SEER")[0];
    const targets = [...room.players.keys()].filter((id) => id !== seerId);

    const first = seerCheck(room, seerId, targets[0]);
    expect(first.ok).toBe(true);
    // Phase has already advanced past NIGHT_SEER, so a second attempt fails on phase, not on the
    // "already acted" guard -- both are valid proof that only one check is possible per night.
    const second = seerCheck(room, seerId, targets[1]);
    expect(second.ok).toBe(false);
  });

  it("skips the check and advances to NIGHT_WITCH once the 60s clock runs out", () => {
    const { room } = setupNightReadyRoom(6);
    advanceToSeerPhase(room);
    expect(room.gameState.phase).toBe("NIGHT_SEER");

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 + 100);

    expect(room.gameState.phase).toBe("NIGHT_WITCH");
    expect(room.gameState.seerChecks).toHaveLength(0);
  });

  it("still runs the full timer when the seer is already dead, instead of skipping instantly", () => {
    const { room } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    const seerId = playersWithRole(room, "SEER")[0];
    room.players.get(seerId)!.isAlive = false;
    const target = [...room.players.keys()].find((id) => !wolves.includes(id) && id !== seerId)!;
    confirmWerewolfKill(room, wolves, target);

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 - 100);
    expect(room.gameState.phase).toBe("NIGHT_SEER");

    vi.advanceTimersByTime(200);
    expect(room.gameState.phase).toBe("NIGHT_WITCH");
  });
});
