import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { werewolfVote } from "../src/game/engine";
import { playersWithRole, setupNightReadyRoom } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

describe("werewolf night phase", () => {
  it("only allows werewolves to vote", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");

    const villagerId = playerIds.find((id) => room.players.get(id)?.role !== "WEREWOLF")!;
    const target = playerIds.find((id) => id !== villagerId)!;

    const result = werewolfVote(room, villagerId, target);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
  });

  it("rejects targeting a dead player", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    const target = playerIds.find((id) => !wolves.includes(id))!;
    room.players.get(target)!.isAlive = false;

    const result = werewolfVote(room, wolves[0], target);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });

  it("allows werewolves to target another werewolf and advances once all wolves vote", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    expect(wolves.length).toBeGreaterThanOrEqual(2);

    wolves.forEach((wolfId, index) => {
      const target = wolves[(index + 1) % wolves.length];
      const result = werewolfVote(room, wolfId, target);
      expect(result.ok).toBe(true);
    });

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    expect(room.gameState.nightKillTargetPlayerId).not.toBeNull();
    expect(wolves).toContain(room.gameState.nightKillTargetPlayerId);
  });

  it("resolves a tie by picking one of the tied candidates at random", () => {
    const outcomes = new Set<string>();

    for (let trial = 0; trial < 30; trial += 1) {
      const { room, playerIds } = setupNightReadyRoom(6);
      const wolves = playersWithRole(room, "WEREWOLF");
      const villagers = playerIds.filter((id) => !wolves.includes(id));
      // Force an even split so the top tally ties between the two targets.
      werewolfVote(room, wolves[0], villagers[0]);
      werewolfVote(room, wolves[1], villagers[1]);

      const killed = room.gameState.nightKillTargetPlayerId;
      expect([villagers[0], villagers[1]]).toContain(killed);
      outcomes.add(killed === villagers[0] ? "first" : "second");
      clearAllRoomsForTest();
    }

    expect(outcomes.size).toBe(2);
  });
});
