import { describe, expect, it } from "vitest";
import { getRoleCountsForPlayerCount } from "@kill-wolf/shared";
import { createShuffledCards } from "../src/game/roleAssignment";

describe("roleAssignment", () => {
  it.each([6, 7, 8, 9, 10, 11, 12])("produces the correct role counts for %i players", (count) => {
    const roleCounts = getRoleCountsForPlayerCount(count);
    const cards = createShuffledCards(roleCounts);

    expect(cards).toHaveLength(count);
    expect(cards.map((c) => c.cardIndex)).toEqual([...Array(count).keys()]);

    const tally = { WEREWOLF: 0, SEER: 0, WITCH: 0, HUNTER: 0, GUARD: 0, KNIGHT: 0, VILLAGER: 0 };
    for (const card of cards) {
      tally[card.role] += 1;
    }
    expect(tally).toEqual(roleCounts);
  });

  it("swaps in optional roles by taking villager slots", () => {
    const roleCounts = getRoleCountsForPlayerCount(6, ["HUNTER", "GUARD"]);
    expect(roleCounts).toEqual({ WEREWOLF: 2, SEER: 1, WITCH: 1, HUNTER: 1, GUARD: 1, KNIGHT: 0, VILLAGER: 0 });

    const cards = createShuffledCards(roleCounts);
    expect(cards).toHaveLength(6);
  });

  it("starts every card unlocked with no hovering players", () => {
    const cards = createShuffledCards(getRoleCountsForPlayerCount(6));
    for (const card of cards) {
      expect(card.isLocked).toBe(false);
      expect(card.lockedByPlayerId).toBeNull();
      expect(card.hoveringPlayerIds.size).toBe(0);
    }
  });
});
