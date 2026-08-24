import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, seerCheck, skipDayDiscussion, werewolfVote, witchAction } from "../src/game/engine";
import { advanceThroughAnnouncementToDiscussion, playersWithRole, setupNightReadyRoom } from "./helpers";
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
  wolves.forEach((wolfId) => werewolfVote(room, wolfId, villagers[0]));
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);

  expect(room.gameState.phase).toBe("DAY_ANNOUNCEMENT");
  advanceThroughAnnouncementToDiscussion();
  expect(room.gameState.phase).toBe("DAY_DISCUSSION");

  for (const player of room.players.values()) {
    if (player.isAlive) skipDayDiscussion(room, player.playerId);
  }
  expect(room.gameState.phase).toBe("DAY_VOTE");
}

function reachDay2Vote(room: Room): void {
  reachDayVote(room);
  for (const player of room.players.values()) {
    if (player.isAlive) dayVote(room, player.playerId, null);
  }
  expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");

  vi.advanceTimersByTime(4500); // DAY_EXILE_RESULT -> NIGHT_START -> NIGHT_WEREWOLF
  expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");
  expect(room.gameState.nightNumber).toBe(2);

  const wolves = playersWithRole(room, "WEREWOLF");
  const villagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
  wolves.forEach((wolfId) => werewolfVote(room, wolfId, villagers[0]));
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);

  advanceThroughAnnouncementToDiscussion();
  for (const player of room.players.values()) {
    if (player.isAlive) skipDayDiscussion(room, player.playerId);
  }
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

  it("day 1 skips the exile when nobody gets a strict majority", () => {
    const { room, playerIds } = setupNightReadyRoom(9);
    reachDayVote(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    expect(alive).toHaveLength(8);
    // Split votes 4 ways among the 8 alive players so no one exceeds half.
    dayVote(room, alive[0], alive[2]);
    dayVote(room, alive[1], alive[2]);
    dayVote(room, alive[2], alive[3]);
    dayVote(room, alive[3], alive[3]);
    dayVote(room, alive[4], alive[5]);
    dayVote(room, alive[5], alive[5]);
    dayVote(room, alive[6], alive[7]);
    dayVote(room, alive[7], alive[7]);

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult?.exiledPlayerId).toBeNull();
  });

  it("day 1 exiles a player who gets a strict majority", () => {
    // Use a 9-player room and exile a villager (not a werewolf) so the majority-vote outcome
    // itself never crosses the werewolf win threshold, keeping this test about vote tallying only.
    const { room, playerIds } = setupNightReadyRoom(9);
    reachDayVote(room);

    const villagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
    const exileTarget = villagers[0];
    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);

    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }

    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult).toEqual({ round: 1, exiledPlayerId: exileTarget });
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

    expect(room.gameState.phase).toBe("DAY_VOTE");
    expect(room.gameState.voteRound).toBe(2);
    expect(room.gameState.voteRunoffCandidateIds).toEqual(expect.arrayContaining([a, b]));

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

    const outsider = rest[0];
    const result = dayVote(room, outsider, rest[1]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });
});
