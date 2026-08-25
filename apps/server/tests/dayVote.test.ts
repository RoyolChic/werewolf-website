import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, seerCheck, witchAction } from "../src/game/engine";
import {
  advanceThroughAnnouncementToDiscussion,
  advanceThroughExileToNextNight,
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

  expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
  advanceThroughAnnouncementToDiscussion();
  expect(room.gameState.phase).toBe("DAY_DISCUSSION");

  skipAllSpeakingTurns(room);
  expect(room.gameState.phase).toBe("DAY_VOTE");
}

function reachDay2Vote(room: Room): void {
  reachDayVote(room);
  for (const player of room.players.values()) {
    if (player.isAlive) dayVote(room, player.playerId, null);
  }
  expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");

  advanceThroughExileToNextNight(room);
  expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
  expect(room.gameState.nightNumber).toBe(2);

  const wolves = playersWithRole(room, "WEREWOLF");
  const villagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
  confirmWerewolfKill(room, wolves, villagers[0]);
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);

  advanceThroughAnnouncementToDiscussion();
  skipAllSpeakingTurns(room);
  expect(room.gameState.phase).toBe("DAY_VOTE");
  expect(room.gameState.dayNumber).toBe(2);
}

describe("day vote", () => {
  it("abstaining still counts as having voted", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const alivePlayerIds = playerIds.filter((id) => room.players.get(id)!.isAlive);
    for (let i = 0; i < alivePlayerIds.length - 1; i += 1) {
      dayVote(room, alivePlayerIds[i], null);
    }
    expect(room.gameState.phase).toBe("DAY_VOTE");

    dayVote(room, alivePlayerIds.at(-1)!, null);
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult?.exiledPlayerId).toBeNull();
  });

  it("day 1 exiles a plurality winner outright, even without a majority", () => {
    // Use a 9-player room and exile a villager (not a werewolf) so the exile outcome itself
    // never crosses the werewolf win threshold, keeping this test about vote tallying only.
    const { room, playerIds } = setupNightReadyRoom(9);
    reachDayVote(room);

    const villagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
    const exileTarget = villagers[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);

    // Only two of several alive players vote for the same target; everyone else abstains, so
    // the target wins on plurality alone, nowhere close to a majority of the 8 alive players.
    dayVote(room, alive[0], exileTarget);
    dayVote(room, alive[1], exileTarget);
    for (const voter of alive.slice(2)) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult).toEqual({ round: 1, exiledPlayerId: exileTarget });
    expect(room.gameState.voteHistory).toHaveLength(1);
  });

  it("day 1 sends tied candidates through one more speaking round, then revotes among just them", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDayVote(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    const [a, b, ...rest] = alive;

    dayVote(room, a, b);
    dayVote(room, b, a);
    for (const voter of rest) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_TIEBREAK_DISCUSSION");
    expect(room.gameState.voteRound).toBe(2);
    expect(room.gameState.voteRunoffCandidateIds).toEqual(expect.arrayContaining([a, b]));
    expect(new Set(room.gameState.discussionSpeakingOrder)).toEqual(new Set([a, b]));

    skipAllSpeakingTurns(room);
    expect(room.gameState.phase).toBe("DAY_VOTE");

    dayVote(room, a, b);
    dayVote(room, b, a);
    for (const voter of rest) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult).toEqual({ round: 2, exiledPlayerId: null });
  });

  it("day 2+ exiles a plurality winner outright, even without a majority", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDay2Vote(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    expect(alive.length).toBeGreaterThanOrEqual(6);

    // Only two of several alive players vote for the same target; everyone else abstains.
    dayVote(room, alive[0], alive[2]);
    dayVote(room, alive[1], alive[2]);
    for (const voter of alive.slice(2)) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult).toEqual({ round: 1, exiledPlayerId: alive[2] });

    expect(room.gameState.nightHistory).toHaveLength(2);
    expect(room.gameState.nightHistory.map((entry) => entry.night)).toEqual([1, 2]);
    expect(room.gameState.voteHistory).toHaveLength(2);
    expect(room.gameState.voteHistory[0]).toMatchObject({ day: 1, round: 1, exiledPlayerId: null });
    expect(room.gameState.voteHistory[1]).toMatchObject({ day: 2, round: 1, exiledPlayerId: alive[2] });
  });

  it("day 2+ runs a second round among tied candidates, then skips if still tied", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDay2Vote(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    const [a, b, ...rest] = alive;

    // Round 1: a and b tie for the top spot.
    dayVote(room, a, b);
    dayVote(room, b, a);
    for (const voter of rest) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_TIEBREAK_DISCUSSION");
    expect(room.gameState.voteRound).toBe(2);
    expect(room.gameState.voteRunoffCandidateIds).toEqual(expect.arrayContaining([a, b]));

    skipAllSpeakingTurns(room);
    expect(room.gameState.phase).toBe("DAY_VOTE");

    // Round 2: still tied -> exile is skipped entirely.
    dayVote(room, a, b);
    dayVote(room, b, a);
    for (const voter of rest) {
      dayVote(room, voter, null);
    }

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult).toEqual({ round: 2, exiledPlayerId: null });
  });

  it("rejects a round-2 vote for someone outside the runoff candidates", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDay2Vote(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    const [a, b, ...rest] = alive;
    dayVote(room, a, b);
    dayVote(room, b, a);
    for (const voter of rest) {
      dayVote(room, voter, null);
    }
    expect(room.gameState.voteRound).toBe(2);
    skipAllSpeakingTurns(room);
    expect(room.gameState.phase).toBe("DAY_VOTE");

    const outsider = rest[0];
    const result = dayVote(room, outsider, rest[1]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });
});
