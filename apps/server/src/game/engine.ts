import { roleFaction } from "@kill-wolf/shared";
import type { Room } from "../rooms/roomTypes";
import { pickRandom } from "../utils/random";
import { alivePlayers, aliveWerewolves, enterPhase } from "./phases";
import { createShuffledCards } from "./roleAssignment";

export interface ActionOutcome {
  ok: boolean;
  code?: string;
  message?: string;
}

function ok(): ActionOutcome {
  return { ok: true };
}

function fail(code: string, message: string): ActionOutcome {
  return { ok: false, code, message };
}

export function startCardPicking(room: Room, requesterPlayerId: string): ActionOutcome {
  if (room.gameState.phase !== "LOBBY") {
    return fail("INVALID_PHASE", "只能在等待房階段開始選牌");
  }
  if (requesterPlayerId !== room.hostPlayerId) {
    return fail("NOT_HOST", "只有房主可以開始選牌");
  }
  if (room.players.size !== room.maxPlayers) {
    return fail("ROOM_NOT_FULL", "人數未到齊，無法開始選牌");
  }

  room.cards = createShuffledCards(room.roleCounts);
  enterPhase(room, "CARD_PICKING");
  return ok();
}

export function pickCard(room: Room, playerId: string, cardIndex: number): ActionOutcome {
  if (room.gameState.phase !== "CARD_PICKING") {
    return fail("INVALID_PHASE", "目前不是選牌階段");
  }
  const player = room.players.get(playerId);
  const card = room.cards[cardIndex];
  if (!player || !card) {
    return fail("NOT_FOUND", "找不到玩家或卡牌");
  }
  if (player.cardIndex !== null) {
    return fail("ALREADY_CONFIRMED", "已確認卡牌，請先取消");
  }
  if (card.isLocked) {
    return fail("CARD_LOCKED", "該牌已被選走");
  }

  for (const c of room.cards) {
    c.hoveringPlayerIds.delete(playerId);
  }
  card.hoveringPlayerIds.add(playerId);
  return ok();
}

export function confirmCard(room: Room, playerId: string, cardIndex: number): ActionOutcome {
  if (room.gameState.phase !== "CARD_PICKING") {
    return fail("INVALID_PHASE", "目前不是選牌階段");
  }
  const player = room.players.get(playerId);
  const card = room.cards[cardIndex];
  if (!player || !card) {
    return fail("NOT_FOUND", "找不到玩家或卡牌");
  }
  if (player.cardIndex !== null) {
    return fail("ALREADY_CONFIRMED", "已確認卡牌，請先取消");
  }
  if (card.isLocked) {
    return fail("CARD_LOCKED", "該牌已被選走");
  }

  for (const c of room.cards) {
    c.hoveringPlayerIds.delete(playerId);
  }
  card.isLocked = true;
  card.lockedByPlayerId = playerId;
  player.cardIndex = cardIndex;

  const allConfirmed = [...room.players.values()].every((p) => p.cardIndex !== null);
  if (allConfirmed) {
    for (const p of room.players.values()) {
      const chosenCard = room.cards[p.cardIndex!];
      p.role = chosenCard.role;
    }
    enterPhase(room, "ROLE_REVEAL");
  }

  return ok();
}

export function cancelCard(room: Room, playerId: string): ActionOutcome {
  if (room.gameState.phase !== "CARD_PICKING") {
    return fail("INVALID_PHASE", "目前不是選牌階段");
  }
  const player = room.players.get(playerId);
  if (!player || player.cardIndex === null) {
    return fail("NOT_CONFIRMED", "尚未確認卡牌");
  }
  const card = room.cards[player.cardIndex];
  card.isLocked = false;
  card.lockedByPlayerId = null;
  player.cardIndex = null;
  return ok();
}

export function confirmRole(room: Room, playerId: string): ActionOutcome {
  if (room.gameState.phase !== "ROLE_REVEAL") {
    return fail("INVALID_PHASE", "目前不是角色確認階段");
  }
  const player = room.players.get(playerId);
  if (!player) {
    return fail("NOT_FOUND", "找不到玩家");
  }
  room.gameState.roleConfirmedPlayerIds.add(playerId);

  if (room.gameState.roleConfirmedPlayerIds.size === room.players.size) {
    enterPhase(room, "NIGHT_START");
  }
  return ok();
}

export function werewolfVote(room: Room, playerId: string, targetPlayerId: string): ActionOutcome {
  if (room.gameState.phase !== "NIGHT_WEREWOLF") {
    return fail("INVALID_PHASE", "目前不是狼人行動階段");
  }
  const player = room.players.get(playerId);
  const target = room.players.get(targetPlayerId);
  if (!player || player.role !== "WEREWOLF" || !player.isAlive) {
    return fail("FORBIDDEN", "非狼人或已死亡");
  }
  if (!target || !target.isAlive) {
    return fail("INVALID_TARGET", "目標必須是存活玩家");
  }
  if (room.gameState.werewolfVotes.has(playerId)) {
    return fail("ALREADY_VOTED", "已投票");
  }

  room.gameState.werewolfVotes.set(playerId, targetPlayerId);

  const wolves = aliveWerewolves(room);
  if (room.gameState.werewolfVotes.size === wolves.length) {
    const tally = new Map<string, number>();
    for (const targetId of room.gameState.werewolfVotes.values()) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
    const topCount = Math.max(...tally.values());
    const topCandidates = [...tally.entries()].filter(([, c]) => c === topCount).map(([id]) => id);
    room.gameState.nightKillTargetPlayerId =
      topCandidates.length === 1 ? topCandidates[0] : pickRandom(topCandidates);
    enterPhase(room, "NIGHT_SEER");
  }

  return ok();
}

export function seerCheck(room: Room, playerId: string, targetPlayerId: string): ActionOutcome {
  if (room.gameState.phase !== "NIGHT_SEER") {
    return fail("INVALID_PHASE", "目前不是預言家行動階段");
  }
  const player = room.players.get(playerId);
  const target = room.players.get(targetPlayerId);
  if (!player || player.role !== "SEER" || !player.isAlive) {
    return fail("FORBIDDEN", "非預言家或已死亡");
  }
  if (!target || !target.isAlive) {
    return fail("INVALID_TARGET", "不能查驗死亡玩家");
  }
  const hasChecked = room.gameState.seerChecks.some(
    (c) => c.night === room.gameState.nightNumber && c.seerPlayerId === playerId,
  );
  if (hasChecked) {
    return fail("ALREADY_ACTED", "本晚已查驗");
  }

  room.gameState.seerChecks.push({
    night: room.gameState.nightNumber,
    seerPlayerId: playerId,
    targetPlayerId,
    faction: roleFaction(target.role!),
  });

  enterPhase(room, "NIGHT_WITCH");
  return ok();
}

export type WitchActionKind = "SAVE" | "POISON" | "SKIP";

export function witchAction(
  room: Room,
  playerId: string,
  action: WitchActionKind,
  targetPlayerId: string | undefined,
): ActionOutcome {
  if (room.gameState.phase !== "NIGHT_WITCH") {
    return fail("INVALID_PHASE", "目前不是女巫行動階段");
  }
  const player = room.players.get(playerId);
  if (!player || player.role !== "WITCH" || !player.isAlive) {
    return fail("FORBIDDEN", "非女巫或已死亡");
  }
  if (room.gameState.witchActedTonight) {
    return fail("ALREADY_ACTED", "本晚已行動");
  }

  if (action === "SAVE") {
    if (!room.gameState.witch.hasAntidote) {
      return fail("NO_ANTIDOTE", "解藥已用完");
    }
    const killedId = room.gameState.nightKillTargetPlayerId;
    if (!killedId) {
      return fail("NO_TARGET", "今晚沒有人被擊殺");
    }
    if (targetPlayerId && targetPlayerId !== killedId) {
      return fail("INVALID_TARGET", "只能救今晚被擊殺的玩家");
    }
    if (killedId === playerId) {
      const canSelfSave =
        room.witchSelfSaveRule === "ANYTIME" ||
        (room.witchSelfSaveRule === "FIRST_NIGHT_ONLY" && room.gameState.nightNumber === 1);
      if (!canSelfSave) {
        return fail("SELF_SAVE_NOT_ALLOWED", "目前規則不允許自救");
      }
    }
    room.gameState.nightSavedPlayerId = killedId;
    room.gameState.witch.hasAntidote = false;
    room.gameState.witch.usedAntidoteOn = killedId;
  } else if (action === "POISON") {
    if (!room.gameState.witch.hasPoison) {
      return fail("NO_POISON", "毒藥已用完");
    }
    if (!targetPlayerId) {
      return fail("NO_TARGET", "請選擇毒殺目標");
    }
    const target = room.players.get(targetPlayerId);
    if (!target || !target.isAlive) {
      return fail("INVALID_TARGET", "不能毒死亡玩家");
    }
    room.gameState.nightPoisonedPlayerId = targetPlayerId;
    room.gameState.witch.hasPoison = false;
    room.gameState.witch.usedPoisonOn = targetPlayerId;
  } else if (action !== "SKIP") {
    return fail("INVALID_ACTION", "未知的女巫操作");
  }

  room.gameState.witchActedTonight = true;
  enterPhase(room, "DAY_ANNOUNCEMENT");
  return ok();
}

export function skipDayDiscussion(room: Room, playerId: string): ActionOutcome {
  if (room.gameState.phase !== "DAY_DISCUSSION") {
    return fail("INVALID_PHASE", "目前不是白天討論階段");
  }
  const player = room.players.get(playerId);
  if (!player || !player.isAlive) {
    return fail("FORBIDDEN", "已死亡玩家不能操作");
  }
  if (room.gameState.discussionSkipRequesterIds.has(playerId)) {
    return fail("ALREADY_SKIPPED", "已按過跳過");
  }

  room.gameState.discussionSkipRequesterIds.add(playerId);

  const alive = alivePlayers(room);
  if (alive.every((p) => room.gameState.discussionSkipRequesterIds.has(p.playerId))) {
    enterPhase(room, "DAY_VOTE");
  }

  return ok();
}

function finalizeExile(room: Room, exiledPlayerId: string | null, round: 1 | 2): void {
  room.gameState.exileResult = { round, exiledPlayerId };
  enterPhase(room, "DAY_EXILE_RESULT");
}

function handleAllDayVotesIn(room: Room): void {
  const { gameState } = room;
  const tally = new Map<string, number>();
  for (const targetId of gameState.dayVotes.values()) {
    if (targetId) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
  }
  const aliveCount = alivePlayers(room).length;

  if (gameState.dayNumber === 1) {
    let topId: string | null = null;
    let topCount = 0;
    for (const [id, count] of tally) {
      if (count > topCount) {
        topCount = count;
        topId = id;
      }
    }
    const exiledPlayerId = topId && topCount * 2 > aliveCount ? topId : null;
    finalizeExile(room, exiledPlayerId, 1);
    return;
  }

  if (tally.size === 0) {
    finalizeExile(room, null, gameState.voteRound);
    return;
  }

  const topCount = Math.max(...tally.values());
  const topCandidates = [...tally.entries()].filter(([, c]) => c === topCount).map(([id]) => id);

  if (topCandidates.length === 1) {
    finalizeExile(room, topCandidates[0], gameState.voteRound);
    return;
  }

  if (gameState.voteRound === 1) {
    gameState.voteRound = 2;
    gameState.voteRunoffCandidateIds = topCandidates;
    gameState.dayVotes.clear();
    return;
  }

  finalizeExile(room, null, 2);
}

export function dayVote(room: Room, playerId: string, targetPlayerId: string | null): ActionOutcome {
  if (room.gameState.phase !== "DAY_VOTE") {
    return fail("INVALID_PHASE", "目前不是投票階段");
  }
  const player = room.players.get(playerId);
  if (!player || !player.isAlive) {
    return fail("FORBIDDEN", "已死亡玩家不能投票");
  }
  if (room.gameState.dayVotes.has(playerId)) {
    return fail("ALREADY_VOTED", "已投票");
  }
  if (targetPlayerId !== null) {
    const target = room.players.get(targetPlayerId);
    if (!target || !target.isAlive) {
      return fail("INVALID_TARGET", "目標必須是存活玩家");
    }
    if (room.gameState.voteRound === 2 && !room.gameState.voteRunoffCandidateIds?.includes(targetPlayerId)) {
      return fail("INVALID_TARGET", "第二輪只能投給平手候選人");
    }
  }

  room.gameState.dayVotes.set(playerId, targetPlayerId);

  const alive = alivePlayers(room);
  if (room.gameState.dayVotes.size === alive.length) {
    handleAllDayVotesIn(room);
  }

  return ok();
}
