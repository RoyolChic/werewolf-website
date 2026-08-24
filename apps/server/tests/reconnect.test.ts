import { afterEach, describe, expect, it } from "vitest";
import { clearAllRoomsForTest } from "../src/rooms/roomStore";
import {
  confirmReconnect,
  disconnectPlayerBySocketId,
  joinRoom,
  kickPlayer,
  maybeTransferHost,
} from "../src/rooms/roomService";
import { createTestRoom } from "./helpers";

afterEach(() => {
  clearAllRoomsForTest();
});

describe("reconnect", () => {
  it("restores identity directly when the reconnect token matches an offline player", () => {
    const { room, playerIds } = createTestRoom(6);
    const player = room.players.get(playerIds[1])!;
    const originalToken = player.reconnectToken!;

    disconnectPlayerBySocketId(player.socketId!, room);
    expect(room.players.get(playerIds[1])?.isConnected).toBe(false);

    const result = joinRoom({ roomId: room.roomId, name: "anything", reconnectToken: originalToken, socketId: "new-socket" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe("RECONNECTED");
      expect(result.player.playerId).toBe(playerIds[1]);
      expect(result.player.isConnected).toBe(true);
      // Token is rotated so it cannot be replayed.
      expect(result.player.reconnectToken).not.toBe(originalToken);
    }
  });

  it("falls back to the name-confirmation flow when the token is missing or stale", () => {
    const { room, playerIds } = createTestRoom(6);
    const player = room.players.get(playerIds[1])!;
    disconnectPlayerBySocketId(player.socketId!, room);

    const attempt = joinRoom({ roomId: room.roomId, name: player.name, socketId: "new-socket" });
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) {
      expect(attempt.code).toBe("RECONNECT_CONFIRMATION_REQUIRED");
    }

    const confirmed = confirmReconnect(room.roomId, player.name, "new-socket");
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.player.playerId).toBe(playerIds[1]);
    }
  });

  it("only lets the first confirmReconnect request claim an offline identity", () => {
    const { room, playerIds } = createTestRoom(6);
    const player = room.players.get(playerIds[1])!;
    disconnectPlayerBySocketId(player.socketId!, room);

    const first = confirmReconnect(room.roomId, player.name, "socket-a");
    const second = confirmReconnect(room.roomId, player.name, "socket-b");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("NAME_NOT_AVAILABLE");
    }
  });

  it("prevents a kicked player from rejoining with the same name", () => {
    const { room, playerIds } = createTestRoom(6);
    const hostId = playerIds[0];
    const targetId = playerIds[1];
    const targetName = room.players.get(targetId)!.name;

    const kickResult = kickPlayer(room, hostId, targetId);
    expect(kickResult.ok).toBe(true);

    const rejoin = joinRoom({ roomId: room.roomId, name: targetName, socketId: "another-socket" });
    expect(rejoin.ok).toBe(false);
    if (!rejoin.ok) {
      expect(rejoin.code).toBe("KICKED");
    }
  });

  it("rejects joining with a name already in use by a connected player", () => {
    const { room, playerIds } = createTestRoom(6);
    const existingName = room.players.get(playerIds[0])!.name;

    const result = joinRoom({ roomId: room.roomId, name: existingName, socketId: "another-socket" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NAME_TAKEN");
    }
  });

  it("transfers the host to the next connected player when the host disconnects in LOBBY", () => {
    const { room, playerIds } = createTestRoom(6);
    const hostPlayer = room.players.get(room.hostPlayerId)!;

    disconnectPlayerBySocketId(hostPlayer.socketId!, room);

    expect(room.hostPlayerId).not.toBe(playerIds[0]);
    expect(room.hostPlayerId).toBe(playerIds[1]);
  });

  it("does not automatically hand the host role back to the original host on reconnect", () => {
    const { room, playerIds } = createTestRoom(6);
    const originalHostId = playerIds[0];
    const hostPlayer = room.players.get(originalHostId)!;
    const originalToken = hostPlayer.reconnectToken!;

    disconnectPlayerBySocketId(hostPlayer.socketId!, room);
    expect(room.hostPlayerId).toBe(playerIds[1]);

    joinRoom({ roomId: room.roomId, name: "anything", reconnectToken: originalToken, socketId: "rejoined-socket" });
    expect(room.hostPlayerId).toBe(playerIds[1]);

    // Only a further disconnect of the *current* host would trigger another transfer.
    maybeTransferHost(room);
    expect(room.hostPlayerId).toBe(playerIds[1]);
  });
});
