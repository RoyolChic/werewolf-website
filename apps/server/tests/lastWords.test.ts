import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_WORDS_SECONDS } from "@kill-wolf/shared";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, endLastWords, seerCheck, witchAction } from "../src/game/engine";
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

function reachDayVote(room: Room): void {
  const wolves = playersWithRole(room, "WEREWOLF");
  const villagers = playersWithRole(room, "VILLAGER");
  confirmWerewolfKill(room, wolves, villagers[0]);
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);

  advanceThroughAnnouncementToDiscussion();
  skipAllSpeakingTurns(room);
}

describe("day last words", () => {
  it("gives the exiled player a last-words turn before night falls, instead of going straight there", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const exileTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");

    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");
    expect(room.gameState.lastWordsPlayerId).toBe(exileTarget);
  });

  it("only lets the exiled player themselves end their last words early", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const exileTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }
    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");

    const someoneElse = alive.find((id) => id !== exileTarget)!;
    const wrongTurn = endLastWords(room, someoneElse);
    expect(wrongTurn.ok).toBe(false);
    expect(wrongTurn.code).toBe("NOT_YOUR_TURN");
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");

    const rightTurn = endLastWords(room, exileTarget);
    expect(rightTurn.ok).toBe(true);
    expect(room.gameState.phase).toBe("NIGHT_START");
  });

  it("exposes END_LAST_WORDS only to the exiled (now dead) player, not to anyone else", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const exileTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }
    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");
    expect(room.players.get(exileTarget)!.isAlive).toBe(false);

    const speakerState = buildPrivateState(room, exileTarget)!;
    expect(speakerState.availableActions).toContain("END_LAST_WORDS");

    const someoneElse = alive.find((id) => id !== exileTarget)!;
    const otherState = buildPrivateState(room, someoneElse)!;
    expect(otherState.availableActions).not.toContain("END_LAST_WORDS");
  });

  it("auto-advances to night once the full timer runs out without anyone ending it", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const exileTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }
    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");

    vi.advanceTimersByTime(LAST_WORDS_SECONDS * 1000 - 100);
    expect(room.gameState.phase).toBe("DAY_LAST_WORDS");

    vi.advanceTimersByTime(200);
    expect(room.gameState.phase).toBe("NIGHT_START");
  });

  it("skips last words entirely when nobody was actually exiled (tie or all-abstain)", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    for (const voter of playerIds.filter((id) => room.players.get(id)!.isAlive)) {
      dayVote(room, voter, null);
    }
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult?.exiledPlayerId).toBeNull();

    vi.advanceTimersByTime(3000);
    expect(room.gameState.phase).toBe("NIGHT_START");
  });
});
