import {
  clampDayDiscussionSeconds,
  createDefaultRoomConfig,
  getRoleCountsForPlayerCount,
  isSameName,
  isValidPlayerCount,
  sanitizeOptionalRoles,
  validatePlayerName,
  type DeadViewMode,
  type OptionalRole,
  type WitchSelfSaveRule,
} from "@kill-wolf/shared";
import { createRoom as storeCreateRoom, deleteRoom, getRoom } from "./roomStore";
import type { Player, Room } from "./roomTypes";
import { createToken } from "../utils/random";
import { createShuffledCards } from "../game/roleAssignment";
import {
  pauseDiscussionTimerIfRunning,
  pauseLastWordsTimerIfRunning,
  pauseNightActionTimerIfRunning,
  resumeDiscussionTimerIfPaused,
  resumeLastWordsTimerIfPaused,
  resumeNightActionTimerIfPaused,
} from "../game/timers";

export interface ServiceFailure {
  ok: false;
  code: string;
  message: string;
}

function fail(code: string, message: string): ServiceFailure {
  return { ok: false, code, message };
}

function createPlayer(name: string, socketId: string): Player {
  return {
    playerId: createToken(),
    socketId,
    name,
    role: null,
    cardIndex: null,
    isAlive: true,
    isConnected: true,
    reconnectToken: createToken(),
    deadViewMode: "HIDDEN",
    joinedAt: Date.now(),
  };
}

function addPlayerToRoom(room: Room, player: Player): void {
  room.players.set(player.playerId, player);
  room.playerOrder.push(player.playerId);
}

export interface CreateRoomInput {
  maxPlayers: number;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
  hostName: string;
  socketId: string;
  optionalRoles?: OptionalRole[];
}

export type CreateRoomSuccess = {
  ok: true;
  room: Room;
  player: Player;
};

export function createRoomAndJoin(input: CreateRoomInput): CreateRoomSuccess | ServiceFailure {
  if (!isValidPlayerCount(input.maxPlayers)) {
    return fail("INVALID_MAX_PLAYERS", "人數必須在 6 到 12 之間");
  }
  const nameResult = validatePlayerName(input.hostName);
  if (!nameResult.isValid) {
    return fail("INVALID_NAME", "名稱格式不正確");
  }

  const optionalRoles = sanitizeOptionalRoles(input.optionalRoles, input.maxPlayers);
  const config = createDefaultRoomConfig(input.maxPlayers, optionalRoles);
  config.dayDiscussionSeconds = clampDayDiscussionSeconds(input.dayDiscussionSeconds);
  config.witchSelfSaveRule = input.witchSelfSaveRule;

  const hostPlaceholderId = createToken();
  const room = storeCreateRoom(config, hostPlaceholderId);

  const player = createPlayer(nameResult.normalizedName, input.socketId);
  room.hostPlayerId = player.playerId;
  addPlayerToRoom(room, player);

  return { ok: true, room, player };
}

export interface JoinRoomInput {
  roomId: string;
  name: string;
  reconnectToken?: string;
  socketId: string;
}

export type JoinRoomSuccess = {
  ok: true;
  kind: "NEW" | "RECONNECTED";
  room: Room;
  player: Player;
  /** Set when a reconnect superseded a still-registered old socket (e.g. a stale tab/refresh race). */
  supersededSocketId?: string;
};

export type JoinRoomNeedsConfirm = {
  ok: false;
  code: "RECONNECT_CONFIRMATION_REQUIRED";
  message: string;
};

export function joinRoom(input: JoinRoomInput): JoinRoomSuccess | JoinRoomNeedsConfirm | ServiceFailure {
  const room = getRoom(input.roomId);
  if (!room) {
    return fail("ROOM_NOT_FOUND", "房間不存在");
  }

  const alreadyJoinedPlayer = [...room.players.values()].find(
    (p) => p.isConnected && p.socketId === input.socketId,
  );
  if (alreadyJoinedPlayer) {
    return { ok: true, kind: "RECONNECTED", room, player: alreadyJoinedPlayer };
  }

  const nameResult = validatePlayerName(input.name);
  if (!nameResult.isValid) {
    return fail("INVALID_NAME", "名稱格式不正確");
  }
  const name = nameResult.normalizedName;

  if (input.reconnectToken) {
    // A valid, not-yet-consumed token proves identity on its own -- it must win even if the
    // player's old connection is still marked connected server-side. That state can be stale:
    // the browser reloaded (a new socket arrives before the server notices the old one drop) or
    // a second tab in the same profile is resuming the identity a first tab still holds. Either
    // way the new socket takes over and the old one (if any) gets forcibly disconnected below.
    const matchedPlayer = [...room.players.values()].find((p) => p.reconnectToken === input.reconnectToken);
    if (matchedPlayer) {
      const supersededSocketId =
        matchedPlayer.isConnected && matchedPlayer.socketId && matchedPlayer.socketId !== input.socketId
          ? matchedPlayer.socketId
          : undefined;

      matchedPlayer.isConnected = true;
      matchedPlayer.socketId = input.socketId;
      matchedPlayer.reconnectToken = createToken();
      if (allAlivePlayersConnected(room)) {
        resumeDiscussionTimerIfPaused(room);
        resumeNightActionTimerIfPaused(room);
        resumeLastWordsTimerIfPaused(room);
      }
      return { ok: true, kind: "RECONNECTED", room, player: matchedPlayer, supersededSocketId };
    }
  }

  if (room.kickedNames.has(name.toLowerCase())) {
    return fail("KICKED", "此名稱已被踢除，無法加入");
  }

  const existingByName = [...room.players.values()].find((p) => isSameName(p.name, name));
  if (existingByName) {
    if (existingByName.isConnected) {
      return fail("NAME_TAKEN", "此名稱已在使用中");
    }
    return { ok: false, code: "RECONNECT_CONFIRMATION_REQUIRED", message: "此名稱有離線玩家，請確認是否恢復身份" };
  }

  if (room.gameState.phase !== "LOBBY") {
    return fail("ROOM_NOT_JOINABLE", "遊戲已開始，無法加入新玩家");
  }
  if (room.players.size >= room.maxPlayers) {
    return fail("ROOM_FULL", "房間已滿");
  }

  const player = createPlayer(name, input.socketId);
  addPlayerToRoom(room, player);
  return { ok: true, kind: "NEW", room, player };
}

export function confirmReconnect(
  roomId: string,
  name: string,
  socketId: string,
): JoinRoomSuccess | ServiceFailure {
  const room = getRoom(roomId);
  if (!room) {
    return fail("ROOM_NOT_FOUND", "房間不存在");
  }

  const offlinePlayer = [...room.players.values()].find((p) => isSameName(p.name, name) && !p.isConnected);
  if (!offlinePlayer) {
    return fail("NAME_NOT_AVAILABLE", "此身份已被其他人恢復或不存在");
  }

  offlinePlayer.isConnected = true;
  offlinePlayer.socketId = socketId;
  offlinePlayer.reconnectToken = createToken();
  if (allAlivePlayersConnected(room)) {
    resumeDiscussionTimerIfPaused(room);
    resumeNightActionTimerIfPaused(room);
    resumeLastWordsTimerIfPaused(room);
  }
  return { ok: true, kind: "RECONNECTED", room, player: offlinePlayer };
}

function allAlivePlayersConnected(room: Room): boolean {
  return [...room.players.values()].every((p) => !p.isAlive || p.isConnected);
}

export function maybeTransferHost(room: Room): void {
  if (room.gameState.phase !== "LOBBY") {
    return;
  }
  const host = room.players.get(room.hostPlayerId);
  if (host && host.isConnected) {
    return;
  }
  const nextHost = room.playerOrder
    .map((id) => room.players.get(id))
    .find((p) => p && p.isConnected);
  if (nextHost) {
    room.hostPlayerId = nextHost.playerId;
  }
}

export function leaveRoom(room: Room, playerId: string): ServiceFailure | { ok: true } {
  const player = room.players.get(playerId);
  if (!player) {
    return fail("NOT_FOUND", "找不到玩家");
  }

  if (room.gameState.phase === "LOBBY" || room.gameState.phase === "CARD_PICKING") {
    room.players.delete(playerId);
    room.playerOrder = room.playerOrder.filter((id) => id !== playerId);
    if (room.gameState.phase === "CARD_PICKING") {
      for (const card of room.cards) {
        card.hoveringPlayerIds.delete(playerId);
        if (card.lockedByPlayerId === playerId) {
          card.isLocked = false;
          card.lockedByPlayerId = null;
        }
      }
    }
    maybeTransferHost(room);
  } else {
    player.isConnected = false;
    player.socketId = null;
    if (player.isAlive) {
      pauseDiscussionTimerIfRunning(room);
      pauseNightActionTimerIfRunning(room);
      pauseLastWordsTimerIfRunning(room);
    }
  }

  return { ok: true };
}

export function kickPlayer(room: Room, requesterPlayerId: string, targetPlayerId: string): ServiceFailure | { ok: true } {
  if (room.gameState.phase !== "LOBBY") {
    return fail("INVALID_PHASE", "只能在等待房階段踢除玩家");
  }
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以踢除玩家");
  }
  if (requesterPlayerId === targetPlayerId) {
    return fail("CANNOT_KICK_SELF", "不能踢除自己");
  }
  const target = room.players.get(targetPlayerId);
  if (!target) {
    return fail("NOT_FOUND", "找不到玩家");
  }

  room.players.delete(targetPlayerId);
  room.playerOrder = room.playerOrder.filter((id) => id !== targetPlayerId);
  room.kickedNames.add(target.name.toLowerCase());

  return { ok: true };
}

export function setMaxPlayers(room: Room, requesterPlayerId: string, maxPlayers: number): ServiceFailure | { ok: true } {
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以重新設定人數");
  }
  if (room.gameState.phase !== "LOBBY" && room.gameState.phase !== "CARD_PICKING") {
    return fail("GAME_ALREADY_STARTED", "遊戲已開始，無法變更人數");
  }
  if (!isValidPlayerCount(maxPlayers)) {
    return fail("INVALID_MAX_PLAYERS", "人數必須在 6 到 12 之間");
  }
  if (maxPlayers < room.players.size) {
    return fail("TOO_MANY_PLAYERS", "目前人數已超過新設定人數");
  }

  room.maxPlayers = maxPlayers;
  room.optionalRoles = sanitizeOptionalRoles(room.optionalRoles, maxPlayers);
  room.roleCounts = getRoleCountsForPlayerCount(maxPlayers, room.optionalRoles);

  if (room.gameState.phase === "CARD_PICKING") {
    for (const player of room.players.values()) {
      player.cardIndex = null;
      player.role = null;
    }
    room.cards = createShuffledCards(room.roleCounts);
  }

  return { ok: true };
}

export function setOptionalRoles(room: Room, requesterPlayerId: string, roles: unknown): ServiceFailure | { ok: true } {
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以設定角色");
  }
  if (room.gameState.phase !== "LOBBY") {
    return fail("INVALID_PHASE", "只能在等待房階段設定角色");
  }

  room.optionalRoles = sanitizeOptionalRoles(roles, room.maxPlayers);
  room.roleCounts = getRoleCountsForPlayerCount(room.maxPlayers, room.optionalRoles);

  return { ok: true };
}

export function setDayDiscussionSeconds(room: Room, requesterPlayerId: string, seconds: number): ServiceFailure | { ok: true } {
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以設定發言秒數");
  }
  if (room.gameState.phase !== "LOBBY") {
    return fail("INVALID_PHASE", "只能在等待房階段設定");
  }
  room.dayDiscussionSeconds = clampDayDiscussionSeconds(seconds);
  return { ok: true };
}

export function setWitchSelfSaveRule(room: Room, requesterPlayerId: string, rule: WitchSelfSaveRule): ServiceFailure | { ok: true } {
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以設定女巫規則");
  }
  if (room.gameState.phase !== "LOBBY") {
    return fail("INVALID_PHASE", "只能在等待房階段設定");
  }
  if (rule !== "FIRST_NIGHT_ONLY" && rule !== "ANYTIME") {
    return fail("INVALID_RULE", "不合法的女巫自救規則");
  }
  room.witchSelfSaveRule = rule;
  return { ok: true };
}

export function setDeadViewMode(room: Room, playerId: string, mode: DeadViewMode): ServiceFailure | { ok: true } {
  const player = room.players.get(playerId);
  if (!player) {
    return fail("NOT_FOUND", "找不到玩家");
  }
  if (mode !== "HIDDEN" && mode !== "FULL") {
    return fail("INVALID_MODE", "不合法的觀看模式");
  }
  player.deadViewMode = mode;
  return { ok: true };
}

export function disconnectPlayerBySocketId(socketId: string, room: Room): Player | null {
  const player = [...room.players.values()].find((p) => p.socketId === socketId);
  if (!player) {
    return null;
  }
  player.isConnected = false;
  player.socketId = null;
  maybeTransferHost(room);
  if (player.isAlive) {
    pauseDiscussionTimerIfRunning(room);
    pauseNightActionTimerIfRunning(room);
    pauseLastWordsTimerIfRunning(room);
  }
  return player;
}

export { deleteRoom };
