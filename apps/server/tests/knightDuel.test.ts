import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { knightDuel, seerCheck, witchAction } from "../src/game/engine";
import { buildPublicRoomState } from "../src/game/publicState";
import { advanceThroughAnnouncementToDiscussion, confirmWerewolfKill, playersWithRole, setupNightReadyRoom } from "./helpers";
import type { Room } from "../src/rooms/roomTypes";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

function reachDayDiscussion(room: Room): void {
  const wolves = playersWithRole(room, "WEREWOLF");
  const villagers = playersWithRole(room, "VILLAGER");
  confirmWerewolfKill(room, wolves, villagers[0]);
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1] ?? villagers[0]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);
  advanceThroughAnnouncementToDiscussion();
}

describe("knight duel", () => {
  it("kills the target and publicly reveals the knight when the target is a werewolf", () => {
    const { room } = setupNightReadyRoom(9, "FIRST_NIGHT_ONLY", ["KNIGHT"]);
    reachDayDiscussion(room);
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");

    const knightId = playersWithRole(room, "KNIGHT")[0];
    const wolfTarget = playersWithRole(room, "WEREWOLF").find((id) => room.players.get(id)!.isAlive)!;

    const result = knightDuel(room, knightId, wolfTarget);
    expect(result.ok).toBe(true);
    expect(room.players.get(wolfTarget)!.isAlive).toBe(false);
    expect(room.players.get(knightId)!.isAlive).toBe(true);
    expect(room.gameState.knightDuelUsed).toBe(true);
    expect(room.gameState.phase).toBe("NIGHT_START");

    const publicState = buildPublicRoomState(room);
    expect(publicState.revealedRoles).toEqual({ [knightId]: "KNIGHT" });
  });

  it("kills the knight when the target turns out to be good, and still moves to night", () => {
    const { room } = setupNightReadyRoom(9, "FIRST_NIGHT_ONLY", ["KNIGHT"]);
    reachDayDiscussion(room);

    const knightId = playersWithRole(room, "KNIGHT")[0];
    const goodTarget = playersWithRole(room, "VILLAGER").find((id) => room.players.get(id)!.isAlive)!;

    const result = knightDuel(room, knightId, goodTarget);
    expect(result.ok).toBe(true);
    expect(room.players.get(goodTarget)!.isAlive).toBe(true);
    expect(room.players.get(knightId)!.isAlive).toBe(false);
    expect(room.gameState.phase).toBe("NIGHT_START");
  });

  it("can only be used once per game", () => {
    const { room } = setupNightReadyRoom(9, "FIRST_NIGHT_ONLY", ["KNIGHT"]);
    reachDayDiscussion(room);
    const knightId = playersWithRole(room, "KNIGHT")[0];
    // Duel a werewolf so the knight survives to (try to) duel again later.
    const wolfTarget = playersWithRole(room, "WEREWOLF").find((id) => room.players.get(id)!.isAlive)!;
    const first = knightDuel(room, knightId, wolfTarget);
    expect(first.ok).toBe(true);
    expect(room.gameState.knightDuelUsed).toBe(true);
    expect(room.gameState.phase).toBe("NIGHT_START");

    // Play through an uneventful night (no guard in this game, so NIGHT_GUARD falls straight
    // through) into the next day, then confirm the duel can't be reused.
    vi.advanceTimersByTime(1200); // NIGHT_START -> NIGHT_GUARD -> (skipped) -> NIGHT_WEREWOLF
    const wolves = playersWithRole(room, "WEREWOLF").filter((id) => room.players.get(id)!.isAlive);
    const villagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
    confirmWerewolfKill(room, wolves, villagers[0]);
    const seerId = playersWithRole(room, "SEER")[0];
    if (room.players.get(seerId)?.isAlive) {
      seerCheck(room, seerId, villagers[1] ?? villagers[0]);
    }
    const witchId = playersWithRole(room, "WITCH")[0];
    if (room.players.get(witchId)?.isAlive) {
      witchAction(room, witchId, "SKIP", undefined);
    }
    advanceThroughAnnouncementToDiscussion();
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");

    const anotherTarget = playersWithRole(room, "VILLAGER").find((id) => room.players.get(id)!.isAlive)!;
    const second = knightDuel(room, knightId, anotherTarget);
    expect(second.ok).toBe(false);
    expect(second.code).toBe("ALREADY_USED");
  });

  it("rejects dueling yourself", () => {
    const { room } = setupNightReadyRoom(9, "FIRST_NIGHT_ONLY", ["KNIGHT"]);
    reachDayDiscussion(room);
    const knightId = playersWithRole(room, "KNIGHT")[0];
    const result = knightDuel(room, knightId, knightId);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });

  it("rejects dueling outside the day phases", () => {
    const { room } = setupNightReadyRoom(9, "FIRST_NIGHT_ONLY", ["KNIGHT"]);
    const knightId = playersWithRole(room, "KNIGHT")[0];
    const target = playersWithRole(room, "VILLAGER")[0];
    const result = knightDuel(room, knightId, target);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PHASE");
  });

  it("ends the game immediately if dueling the last werewolf wins it for the villagers", () => {
    const { room } = setupNightReadyRoom(6, "ANYTIME", ["KNIGHT"]);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villager = playersWithRole(room, "VILLAGER")[0];
    confirmWerewolfKill(room, wolves, villager);
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, wolves[0]);
    const witchId = playersWithRole(room, "WITCH")[0];
    witchAction(room, witchId, "POISON", wolves[1]);

    advanceThroughAnnouncementToDiscussion();
    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
    expect(room.players.get(wolves[1])!.isAlive).toBe(false);
    expect(room.gameState.winner).toBeNull();

    const knightId = playersWithRole(room, "KNIGHT")[0];
    const result = knightDuel(room, knightId, wolves[0]);
    expect(result.ok).toBe(true);
    expect(room.gameState.phase).toBe("GAME_OVER");
    expect(room.gameState.winner).toBe("VILLAGER");
  });
});
