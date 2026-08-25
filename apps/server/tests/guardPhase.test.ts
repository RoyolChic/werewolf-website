import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NIGHT_ACTION_SECONDS } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, guardProtect, seerCheck, witchAction } from "../src/game/engine";
import {
  advanceThroughAnnouncementToDiscussion,
  confirmWerewolfKill,
  playersWithRole,
  setupGuardReadyRoom,
  skipAllSpeakingTurns,
} from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

describe("guard night phase", () => {
  it("only allows the guard to act, and only during NIGHT_GUARD", () => {
    const { room, playerIds } = setupGuardReadyRoom(8, ["GUARD"]);
    const guardId = playersWithRole(room, "GUARD")[0];
    const someoneElse = playerIds.find((id) => id !== guardId)!;

    const notGuard = playersWithRole(room, "VILLAGER")[0];
    const forbidden = guardProtect(room, notGuard, someoneElse);
    expect(forbidden.ok).toBe(false);
    expect(forbidden.code).toBe("FORBIDDEN");

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 + 100);
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");

    const wrongPhase = guardProtect(room, guardId, someoneElse);
    expect(wrongPhase.ok).toBe(false);
    expect(wrongPhase.code).toBe("INVALID_PHASE");
  });

  it("skips NIGHT_GUARD instantly when there is no guard in the game", () => {
    const { room } = setupGuardReadyRoom(6, []);
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
  });

  it("still runs the full timer when the guard in the game has already died", () => {
    const { room } = setupGuardReadyRoom(8, ["GUARD"]);
    const guardId = playersWithRole(room, "GUARD")[0];
    room.players.get(guardId)!.isAlive = false;

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 - 100);
    expect(room.gameState.phase).toBe("NIGHT_GUARD");

    vi.advanceTimersByTime(200);
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
  });

  it("advances to NIGHT_WEREWOLF without protecting anyone if the guard doesn't act in time", () => {
    const { room } = setupGuardReadyRoom(8, ["GUARD"]);
    expect(room.gameState.phase).toBe("NIGHT_GUARD");

    vi.advanceTimersByTime(NIGHT_ACTION_SECONDS * 1000 + 100);

    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
    expect(room.gameState.nightGuardedPlayerId).toBeNull();
  });

  it("protects its target from the werewolves' kill", () => {
    const { room } = setupGuardReadyRoom(8, ["GUARD"]);
    const guardId = playersWithRole(room, "GUARD")[0];
    const villagers = playersWithRole(room, "VILLAGER");
    const target = villagers[0];

    const result = guardProtect(room, guardId, target);
    expect(result.ok).toBe(true);
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");

    const wolves = playersWithRole(room, "WEREWOLF");
    confirmWerewolfKill(room, wolves, target);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, villagers[1]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "SKIP", undefined);

    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.players.get(target)!.isAlive).toBe(true);
    expect(room.gameState.lastNightDeathPlayerIds).toEqual([]);
  });

  it("guard and witch protecting the same target still results in death (同守同救)", () => {
    const { room } = setupGuardReadyRoom(8, ["GUARD"]);
    const guardId = playersWithRole(room, "GUARD")[0];
    const villagers = playersWithRole(room, "VILLAGER");
    const target = villagers[0];
    guardProtect(room, guardId, target);

    const wolves = playersWithRole(room, "WEREWOLF");
    confirmWerewolfKill(room, wolves, target);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, villagers[1]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "SAVE", target);

    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.players.get(target)!.isAlive).toBe(false);
    expect(room.gameState.lastNightDeathPlayerIds).toEqual([target]);
    expect(room.gameState.nightHistory.at(-1)?.doubleProtected).toBe(true);
  });

  it("cannot protect the same target on consecutive nights", () => {
    const { room } = setupGuardReadyRoom(8, ["GUARD"]);
    const guardId = playersWithRole(room, "GUARD")[0];
    const villagers = playersWithRole(room, "VILLAGER");
    const target = villagers[0];
    guardProtect(room, guardId, target);

    const wolves = playersWithRole(room, "WEREWOLF");
    confirmWerewolfKill(room, wolves, villagers[1]);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, villagers[2]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "SKIP", undefined);

    advanceThroughAnnouncementToDiscussion();
    skipAllSpeakingTurns(room);
    for (const player of room.players.values()) {
      if (player.isAlive) dayVote(room, player.playerId, null);
    }
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");

    vi.advanceTimersByTime(3000 + 1200); // DAY_EXILE_RESULT -> NIGHT_START -> NIGHT_GUARD
    expect(room.gameState.phase).toBe("NIGHT_GUARD");

    const rejected = guardProtect(room, guardId, target);
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe("SAME_TARGET_AS_LAST_NIGHT");

    const otherTarget = playersWithRole(room, "VILLAGER").find(
      (id) => id !== target && room.players.get(id)!.isAlive,
    )!;
    const accepted = guardProtect(room, guardId, otherTarget);
    expect(accepted.ok).toBe(true);
  });
});
