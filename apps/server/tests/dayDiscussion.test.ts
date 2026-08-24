import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { dayVote, seerCheck, skipDayDiscussion, werewolfVote, witchAction } from "../src/game/engine";
import {
  advanceThroughAnnouncementToDiscussion,
  advanceThroughExileToNextNight,
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

function reachDay1Discussion(room: Room): void {
  const wolves = playersWithRole(room, "WEREWOLF");
  const villagers = playersWithRole(room, "VILLAGER");
  wolves.forEach((wolfId) => werewolfVote(room, wolfId, villagers[0]));
  const seerId = playersWithRole(room, "SEER")[0];
  seerCheck(room, seerId, villagers[1]);
  const witchId = playersWithRole(room, "WITCH")[0];
  witchAction(room, witchId, "SKIP", undefined);
  advanceThroughAnnouncementToDiscussion();
}

describe("day discussion speaking order", () => {
  it("day 1 starts right after whoever died overnight and lists every alive player once", () => {
    const { room } = setupNightReadyRoom(8);
    reachDay1Discussion(room);

    expect(room.gameState.phase).toBe("DAY_DISCUSSION");
    // One villager died overnight (the werewolves' kill target, unsaved), so 7 remain.
    expect(room.gameState.discussionSpeakingOrder).toHaveLength(7);
    expect(room.gameState.currentSpeakerIndex).toBe(0);

    // The night's death is the anchor: the order should start at the next alive seat after it.
    const n = room.playerOrder.length;
    const expectedFirstSpeaker = nextAliveSeatAfter(room, room.gameState.lastRemovedSeatIndex, n);
    expect(room.gameState.discussionSpeakingOrder[0]).toBe(expectedFirstSpeaker);
    expect(new Set(room.gameState.discussionSpeakingOrder)).toEqual(
      new Set([...room.players.values()].filter((p) => p.isAlive).map((p) => p.playerId)),
    );
  });

  it("only the current speaker can end their turn", () => {
    const { room } = setupNightReadyRoom(6);
    reachDay1Discussion(room);

    const currentSpeaker = room.gameState.discussionSpeakingOrder[0];
    const someoneElse = room.gameState.discussionSpeakingOrder[1];

    const wrongTurn = skipDayDiscussion(room, someoneElse);
    expect(wrongTurn.ok).toBe(false);
    expect(wrongTurn.code).toBe("NOT_YOUR_TURN");

    const rightTurn = skipDayDiscussion(room, currentSpeaker);
    expect(rightTurn.ok).toBe(true);
    expect(room.gameState.currentSpeakerIndex).toBe(1);
    expect(room.gameState.discussionSpeakingOrder[room.gameState.currentSpeakerIndex]).toBe(someoneElse);
  });

  it("moves to DAY_VOTE once the last speaker's turn ends", () => {
    const { room } = setupNightReadyRoom(6);
    reachDay1Discussion(room);

    skipAllSpeakingTurns(room);
    expect(room.gameState.phase).toBe("DAY_VOTE");
  });

  it("gives each speaker their own full-length timer, not a shared one", () => {
    const { room } = setupNightReadyRoom(6);
    reachDay1Discussion(room);

    const firstDeadline = room.gameState.discussionEndsAt;
    expect(firstDeadline).not.toBeNull();

    vi.advanceTimersByTime(30_000); // room.dayDiscussionSeconds is 60s in the test helper
    expect(room.gameState.currentSpeakerIndex).toBe(0); // first speaker's turn hasn't expired yet

    vi.advanceTimersByTime(30_001); // now it has -- auto-advance to the next speaker
    expect(room.gameState.currentSpeakerIndex).toBe(1);
    // the new speaker gets a fresh full-length deadline, not whatever was left of the first one
    expect(room.gameState.discussionEndsAt).not.toBeNull();
    expect(room.gameState.discussionEndsAt! - Date.now()).toBeGreaterThan(55_000);
  });

  it("starts the next day's order right after whoever was exiled", () => {
    const { room, playerIds } = setupNightReadyRoom(8);
    reachDay1Discussion(room);
    skipAllSpeakingTurns(room);

    const alive = playerIds.filter((id) => room.players.get(id)!.isAlive);
    // Exile a villager specifically (not the witch) so the witch is still around on night 2 to
    // save her target -- otherwise nobody's left to prevent that death, which would overwrite
    // the anchor this test is trying to isolate.
    const exileTarget = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive)[0];
    for (const voter of alive) {
      dayVote(room, voter, voter === exileTarget ? null : exileTarget);
    }
    expect(room.gameState.phase).toBe("DAY_EXILE_RESULT");
    expect(room.gameState.exileResult?.exiledPlayerId).toBe(exileTarget);

    advanceThroughExileToNextNight();
    expect(room.gameState.phase).toBe("NIGHT_WEREWOLF");

    // Resolve night 2 with nobody dying (the witch saves the target), so the exile from day 1
    // remains the most recent removal and thus the anchor for day 2's speaking order.
    const wolves = playersWithRole(room, "WEREWOLF");
    const remainingVillagers = playersWithRole(room, "VILLAGER").filter((id) => room.players.get(id)!.isAlive);
    wolves.forEach((wolfId) => werewolfVote(room, wolfId, remainingVillagers[0]));
    const seerId = playersWithRole(room, "SEER")[0];
    if (room.players.get(seerId)?.isAlive) {
      seerCheck(room, seerId, remainingVillagers[1] ?? remainingVillagers[0]);
    }
    const witchId = playersWithRole(room, "WITCH")[0];
    if (room.players.get(witchId)?.isAlive) {
      witchAction(room, witchId, "SAVE", room.gameState.nightKillTargetPlayerId ?? undefined);
    }
    advanceThroughAnnouncementToDiscussion();

    const n = room.playerOrder.length;
    const expectedFirstSpeaker = nextAliveSeatAfter(room, room.gameState.lastRemovedSeatIndex, n);
    expect(room.playerOrder.indexOf(exileTarget)).toBe(room.gameState.lastRemovedSeatIndex);
    expect(room.gameState.discussionSpeakingOrder[0]).toBe(expectedFirstSpeaker);
  });
});

function nextAliveSeatAfter(room: Room, anchorSeatIndex: number, seatCount: number): string | null {
  for (let offset = 1; offset <= seatCount; offset += 1) {
    const seatIndex = (anchorSeatIndex + offset + seatCount) % seatCount;
    const playerId = room.playerOrder[seatIndex];
    if (room.players.get(playerId)?.isAlive) {
      return playerId;
    }
  }
  return null;
}
