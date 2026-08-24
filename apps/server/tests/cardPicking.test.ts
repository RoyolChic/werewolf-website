import { afterEach, describe, expect, it } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import { cancelCard, confirmCard, pickCard, startCardPicking } from "../src/game/engine";
import { createTestRoom } from "./helpers";

afterEach(() => {
  clearAllRoomsForTest();
});

describe("card picking", () => {
  it("lets the first player to confirm take a card, rejects the second", () => {
    const { room, playerIds } = createTestRoom(6);
    startCardPicking(room, playerIds[0]);

    pickCard(room, playerIds[0], 0);
    pickCard(room, playerIds[1], 0);
    expect(room.cards[0].hoveringPlayerIds.size).toBe(2);

    const first = confirmCard(room, playerIds[1], 0);
    expect(first.ok).toBe(true);

    const second = confirmCard(room, playerIds[0], 0);
    expect(second.ok).toBe(false);
    expect(second.code).toBe("CARD_LOCKED");
  });

  it("rejects picking a card that is already locked", () => {
    const { room, playerIds } = createTestRoom(6);
    startCardPicking(room, playerIds[0]);
    confirmCard(room, playerIds[0], 0);

    const result = pickCard(room, playerIds[1], 0);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("CARD_LOCKED");
  });

  it("allows a confirmed player to cancel and reselect another card", () => {
    const { room, playerIds } = createTestRoom(6);
    startCardPicking(room, playerIds[0]);
    confirmCard(room, playerIds[0], 0);

    const cancelResult = cancelCard(room, playerIds[0]);
    expect(cancelResult.ok).toBe(true);
    expect(room.cards[0].isLocked).toBe(false);

    const reconfirm = confirmCard(room, playerIds[0], 1);
    expect(reconfirm.ok).toBe(true);
    expect(room.players.get(playerIds[0])?.cardIndex).toBe(1);
  });

  it("does not reveal roles until every player has confirmed a card", () => {
    const { room, playerIds } = createTestRoom(6);
    startCardPicking(room, playerIds[0]);

    for (let i = 0; i < playerIds.length - 1; i += 1) {
      confirmCard(room, playerIds[i], i);
      expect(room.gameState.phase).toBe("CARD_PICKING");
    }

    confirmCard(room, playerIds[playerIds.length - 1], playerIds.length - 1);
    expect(room.gameState.phase).toBe("ROLE_REVEAL");

    for (const playerId of playerIds) {
      expect(room.players.get(playerId)?.role).not.toBeNull();
    }
  });
});
