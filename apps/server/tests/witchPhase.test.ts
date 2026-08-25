import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NIGHT_ACTION_SECONDS } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { seerCheck, witchAction } from "../src/game/engine";
import { buildPrivateState } from "../src/game/privateState";
import { confirmWerewolfKill, playersWithRole, setupNightReadyRoom, skipWholeDayIntoNextNight } from "./helpers";
import type { Room } from "../src/rooms/roomTypes";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

function killTargetAndReachWitchPhase(room: Room, targetPlayerId: string): void {
  const wolves = playersWithRole(room, "WEREWOLF");
  confirmWerewolfKill(room, wolves, targetPlayerId);
  const seerId = playersWithRole(room, "SEER")[0];
  const seerTarget = [...room.players.keys()].find((id) => id !== seerId && room.players.get(id)!.isAlive)!;
  seerCheck(room, seerId, seerTarget);
}

describe("witch night phase", () => {
  it("allows first-night self save under the FIRST_NIGHT_ONLY rule", () => {
    const { room } = setupNightReadyRoom(6, "FIRST_NIGHT_ONLY");
    const witchId = playersWithRole(room, "WITCH")[0];
    killTargetAndReachWitchPhase(room, witchId);

    expect(room.gameState.phase).toBe("NIGHT_WITCH");
    const result = witchAction(room, witchId, "SAVE", witchId);
    expect(result.ok).toBe(true);
    expect(room.gameState.nightSavedPlayerId).toBe(witchId);
  });

  it("rejects self save on a later night under the FIRST_NIGHT_ONLY rule", () => {
    const { room } = setupNightReadyRoom(6, "FIRST_NIGHT_ONLY");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagerId = playersWithRole(room, "VILLAGER")[0];

    // Night 1: nobody dangerous happens to the witch, she skips to preserve her potions.
    killTargetAndReachWitchPhase(room, villagerId);
    witchAction(room, witchId, "SKIP", undefined);

    skipWholeDayIntoNextNight(room);
    expect(room.gameState.nightNumber).toBe(2);

    killTargetAndReachWitchPhase(room, witchId);
    const result = witchAction(room, witchId, "SAVE", witchId);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("SELF_SAVE_NOT_ALLOWED");
  });

  it("allows self save on a later night under the ANYTIME rule", () => {
    const { room } = setupNightReadyRoom(6, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagerId = playersWithRole(room, "VILLAGER")[0];

    killTargetAndReachWitchPhase(room, villagerId);
    witchAction(room, witchId, "SKIP", undefined);

    skipWholeDayIntoNextNight(room);
    expect(room.gameState.nightNumber).toBe(2);

    killTargetAndReachWitchPhase(room, witchId);
    const result = witchAction(room, witchId, "SAVE", witchId);
    expect(result.ok).toBe(true);
  });

  it("only allows the antidote and poison to be used once each", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagers = playersWithRole(room, "VILLAGER");

    killTargetAndReachWitchPhase(room, villagers[0]);
    witchAction(room, witchId, "SAVE", villagers[0]);
    expect(room.gameState.witch.hasAntidote).toBe(false);

    skipWholeDayIntoNextNight(room);
    killTargetAndReachWitchPhase(room, villagers[1]);
    const secondSave = witchAction(room, witchId, "SAVE", villagers[1]);
    expect(secondSave.ok).toBe(false);
    expect(secondSave.code).toBe("NO_ANTIDOTE");

    const poison = witchAction(room, witchId, "POISON", villagers[2]);
    expect(poison.ok).toBe(true);
    expect(room.gameState.witch.hasPoison).toBe(false);
  });

  it("cannot save and poison in the same night", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagers = playersWithRole(room, "VILLAGER");

    killTargetAndReachWitchPhase(room, villagers[0]);
    const saveResult = witchAction(room, witchId, "SAVE", villagers[0]);
    expect(saveResult.ok).toBe(true);

    const poisonResult = witchAction(room, witchId, "POISON", villagers[1]);
    expect(poisonResult.ok).toBe(false);
  });

  it("cannot poison a dead player", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagers = playersWithRole(room, "VILLAGER");
    room.players.get(villagers[1])!.isAlive = false;

    killTargetAndReachWitchPhase(room, villagers[0]);
    const result = witchAction(room, witchId, "POISON", villagers[1]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });

  it("skips the witch's action and advances to DAY_ANNOUNCEMENT once the 60s clock runs out", () => {
    const { room } = setupNightReadyRoom(6, "ANYTIME");
    const villagers = playersWithRole(room, "VILLAGER");
    killTargetAndReachWitchPhase(room, villagers[0]);
    expect(room.gameState.phase).toBe("NIGHT_WITCH");

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 + 100);

    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.gameState.witch.hasAntidote).toBe(true);
    expect(room.gameState.witch.hasPoison).toBe(true);
  });

  it("hides the night's kill target from the witch once she's out of antidote", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    const villagers = playersWithRole(room, "VILLAGER");

    killTargetAndReachWitchPhase(room, villagers[0]);
    witchAction(room, witchId, "SAVE", villagers[0]);
    expect(room.gameState.witch.hasAntidote).toBe(false);

    skipWholeDayIntoNextNight(room);
    killTargetAndReachWitchPhase(room, villagers[1]);

    // The kill actually happened (villagers[1] is really the target), but without an antidote
    // left there's nothing she can do about it -- the server shouldn't leak who it was.
    expect(room.gameState.nightKillTargetPlayerId).toBe(villagers[1]);
    const privateState = buildPrivateState(room, witchId)!;
    expect(privateState.witch?.hasAntidote).toBe(false);
    expect(privateState.witch?.tonightKilledPlayerId).toBeNull();
  });

  it("still runs the full timer when the witch is already dead, instead of skipping instantly", () => {
    const { room } = setupNightReadyRoom(8, "ANYTIME");
    const witchId = playersWithRole(room, "WITCH")[0];
    room.players.get(witchId)!.isAlive = false;
    const villagers = playersWithRole(room, "VILLAGER");
    killTargetAndReachWitchPhase(room, villagers[0]);

    expect(room.gameState.phase).toBe("NIGHT_WITCH");
    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 - 100);
    expect(room.gameState.phase).toBe("NIGHT_WITCH");

    vi.advanceTimersByTime(200);
    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
  });
});
