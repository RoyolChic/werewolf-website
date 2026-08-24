import { describe, expect, it } from "vitest";
import { ROLE_COUNTS_BY_PLAYER_COUNT } from "@kill-wolf/shared";
import { createShuffledCards } from "../src/game/roleAssignment";

describe("roleAssignment", () => {
  it.each([6, 7, 8, 9, 10, 11, 12])("produces the correct role counts for %i players", (count) => {
    const roleCounts = ROLE_COUNTS_BY_PLAYER_COUNT[count];
    const cards = createShuffledCards(roleCounts);

    expect(cards).toHaveLength(count);
    expect(cards.map((c) => c.cardIndex)).toEqual([...Array(count).keys()]);

    const tally = { WEREWOLF: 0, SEER: 0, WITCH: 0, VILLAGER: 0 };
    for (const card of cards) {
      tally[card.role] += 1;
    }
    expect(tally).toEqual(roleCounts);
  });

  it("starts every card unlocked with no hovering players", () => {
    const cards = createShuffledCards(ROLE_COUNTS_BY_PLAYER_COUNT[6]);
    for (const card of cards) {
      expect(card.isLocked).toBe(false);
      expect(card.lockedByPlayerId).toBeNull();
      expect(card.hoveringPlayerIds.size).toBe(0);
    }
  });
});
