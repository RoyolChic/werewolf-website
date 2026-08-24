import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateWinner } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, seerCheck, werewolfVote, witchAction } from "../src/game/engine";
import { playersWithRole, setupNightReadyRoom } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearAllRoomsForTest();
});

describe("win conditions (pure function)", () => {
  it("villagers win once every werewolf is dead", () => {
    const winner = evaluateWinner([{ role: "SEER" }, { role: "WITCH" }, { role: "VILLAGER" }]);
    expect(winner).toBe("VILLAGER");
  });

  it("werewolves win once they are at least half of those remaining", () => {
    const winner = evaluateWinner([{ role: "WEREWOLF" }, { role: "WEREWOLF" }, { role: "VILLAGER" }]);
    expect(winner).toBe("WEREWOLF");
  });

  it("nobody has won yet when werewolves are outnumbered and still alive", () => {
    const winner = evaluateWinner([{ role: "WEREWOLF" }, { role: "VILLAGER" }, { role: "VILLAGER" }]);
    expect(winner).toBeNull();
  });
});

describe("win conditions (engine integration)", () => {
  it("ends the game for the villagers once the last werewolf is poisoned", () => {
    const { room } = setupNightReadyRoom(6, "ANYTIME");
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playersWithRole(room, "VILLAGER");

    wolves.forEach((wolfId) => werewolfVote(room, wolfId, villagers[0]));
    const seerId = playersWithRole(room, "SEER")[0];
    seerCheck(room, seerId, wolves[0]);
    const witchId = playersWithRole(room, "WITCH")[0];

    // Poison every werewolf across successive nights until none are left.
    witchAction(room, witchId, "POISON", wolves[0]);
    expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
    expect(room.players.get(wolves[0])?.isAlive).toBe(false);
    expect(room.players.get(wolves[1])?.isAlive).toBe(true);
    expect(room.gameState.winner).toBeNull();
  });

  it("stops accepting game actions once GAME_OVER is reached", () => {
    const { room, playerIds } = setupNightReadyRoom(6, "ANYTIME");
    room.gameState.phase = "GAME_OVER";
    room.gameState.winner = "VILLAGER";

    const voteResult = dayVote(room, playerIds[0], playerIds[1]);
    expect(voteResult.ok).toBe(false);
    expect(voteResult.code).toBe("INVALID_PHASE");

    const wolves = playersWithRole(room, "WEREWOLF");
    const killResult = werewolfVote(room, wolves[0], playerIds[1]);
    expect(killResult.ok).toBe(false);
    expect(killResult.code).toBe("INVALID_PHASE");
  });
});
