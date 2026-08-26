import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNightActionSeconds } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { werewolfConfirmVote, werewolfUnconfirmVote, werewolfVote } from "../src/game/engine";
import { buildPrivateState } from "../src/game/privateState";
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

  it("allows werewolves to target another werewolf and advances once all wolves confirm", () => {
    const { room } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    expect(wolves.length).toBeGreaterThanOrEqual(2);

    wolves.forEach((wolfId, index) => {
      const target = wolves[(index + 1) % wolves.length];
      const result = werewolfVote(room, wolfId, target);
      expect(result.ok).toBe(true);
    });
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");

    wolves.forEach((wolfId, index) => {
      const confirmResult = werewolfConfirmVote(room, wolfId);
      // The last wolf to confirm is the one that tips the phase over into NIGHT_SEER.
      expect(confirmResult.ok).toBe(true);
      if (index < wolves.length - 1) {
        expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
      }
    });

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    expect(room.gameState.nightKillTargetPlayerId).not.toBeNull();
    expect(wolves).toContain(room.gameState.nightKillTargetPlayerId);
  });

  it("lets a werewolf change their target freely before confirming", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playerIds.filter((id) => !wolves.includes(id));

    expect(werewolfVote(room, wolves[0], villagers[0]).ok).toBe(true);
    expect(werewolfVote(room, wolves[0], villagers[1]).ok).toBe(true);
    expect(room.gameState.werewolfVotes.get(wolves[0])).toBe(villagers[1]);
  });

  it("rejects re-selecting a target after confirming, until unconfirmed", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playerIds.filter((id) => !wolves.includes(id));

    werewolfVote(room, wolves[0], villagers[0]);
    expect(werewolfConfirmVote(room, wolves[0]).ok).toBe(true);

    const reselect = werewolfVote(room, wolves[0], villagers[1]);
    expect(reselect.ok).toBe(false);
    expect(reselect.code).toBe("ALREADY_CONFIRMED");

    expect(werewolfUnconfirmVote(room, wolves[0]).ok).toBe(true);
    expect(werewolfVote(room, wolves[0], villagers[1]).ok).toBe(true);
    expect(room.gameState.werewolfVotes.get(wolves[0])).toBe(villagers[1]);
  });

  it("requires a selected target before confirming", () => {
    const { room } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");

    const result = werewolfConfirmVote(room, wolves[0]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_TARGET");
  });

  it("lets werewolves see each other's live votes but hides them from non-werewolves", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villager = playerIds.find((id) => !wolves.includes(id))!;

    werewolfVote(room, wolves[0], villager);

    const firstWolfView = buildPrivateState(room, wolves[0])!;
    expect(firstWolfView.werewolfVotes).toEqual({ [wolves[0]]: villager });

    const secondWolfView = buildPrivateState(room, wolves[1])!;
    expect(secondWolfView.werewolfVotes).toEqual({ [wolves[0]]: villager });

    const villagerView = buildPrivateState(room, villager)!;
    expect(villagerView.werewolfVotes).toBeNull();
  });

  it("stops exposing werewolf votes once the phase has moved past NIGHT_WEREWOLF", () => {
    const { room } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    wolves.forEach((wolfId, index) => werewolfVote(room, wolfId, wolves[(index + 1) % wolves.length]));
    wolves.forEach((wolfId) => werewolfConfirmVote(room, wolfId));

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    const view = buildPrivateState(room, wolves[0])!;
    expect(view.werewolfVotes).toBeNull();
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
      werewolfConfirmVote(room, wolves[0]);
      werewolfConfirmVote(room, wolves[1]);

      const killed = room.gameState.nightKillTargetPlayerId;
      expect([villagers[0], villagers[1]]).toContain(killed);
      outcomes.add(killed === villagers[0] ? "first" : "second");
      clearAllRoomsForTest();
    }

    expect(outcomes.size).toBe(2);
  });

  it("forces a resolution using whatever targets were selected once the clock runs out", () => {
    const { room, playerIds } = setupNightReadyRoom(6);
    const wolves = playersWithRole(room, "WEREWOLF");
    const villagers = playerIds.filter((id) => !wolves.includes(id));

    // Only the first wolf picks a target; nobody confirms.
    werewolfVote(room, wolves[0], villagers[0]);

    vi.advanceTimersByTime(getNightActionSeconds("NIGHT_WEREWOLF") * 1000 + 100);

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    expect(room.gameState.nightKillTargetPlayerId).toBe(villagers[0]);
  });

  it("moves on with no kill target if nobody selected anyone before the clock runs out", () => {
    const { room } = setupNightReadyRoom(6);

    vi.advanceTimersByTime(getNightActionSeconds("NIGHT_WEREWOLF") * 1000 + 100);

    expect(room.gameState.phase).toBe("NIGHT_SEER");
    expect(room.gameState.nightKillTargetPlayerId).toBeNull();
  });
});
