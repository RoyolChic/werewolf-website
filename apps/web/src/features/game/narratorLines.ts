import { FACTION_LABELS, type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";

function playerName(publicState: PublicRoomState, playerId: string | null | undefined): string | null {
  if (!playerId) return null;
  return publicState.players.find((p) => p.playerId === playerId)?.name ?? null;
}

/**
 * Produces the one-line "host script" text for the current phase, tailored to whether the
 * viewer is the role that's currently supposed to be acting. Purely presentational -- it derives
 * everything from the same public/private state the rest of the UI already renders from.
 */
export function getNarratorLine(
  publicState: PublicRoomState,
  privateState: PrivatePlayerState,
  selfPlayerId: string,
): string | null {
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);
  const isAlive = self?.isAlive ?? false;

  switch (publicState.phase) {
    case "NIGHT_GUARD": {
      if (privateState.role === "GUARD" && isAlive) {
        return privateState.availableActions.includes("GUARD_PROTECT")
          ? "守衛請睜眼，請選擇你要守護的對象"
          : "守衛請閉眼";
      }
      return "天黑請閉眼";
    }
    case "NIGHT_START":
    case "NIGHT_WEREWOLF": {
      if (privateState.role === "WEREWOLF" && isAlive) {
        const confirmed = privateState.werewolfConfirmedPlayerIds?.includes(selfPlayerId) ?? false;
        return confirmed ? "狼人請閉眼" : "狼人請睜眼，你們要殺的人是？";
      }
      return "天黑請閉眼";
    }
    case "NIGHT_SEER": {
      if (privateState.role === "SEER" && isAlive) {
        // seerChecks accumulates every night's checks, not just tonight's -- on any night after
        // the first, its last entry is stale (last night's result) until she actually checks
        // again tonight, so it has to be matched against the current night rather than just
        // checked for existence.
        const latestCheck = privateState.seerChecks?.at(-1);
        const hasCheckedTonight = latestCheck?.night === publicState.nightNumber;
        if (hasCheckedTonight && latestCheck) {
          const targetName = playerName(publicState, latestCheck.targetPlayerId) ?? "對方";
          return `${targetName}的身分是${FACTION_LABELS[latestCheck.faction]}，預言家請閉眼（查驗結果已記錄在右下角「📜紀錄→我的紀錄」）`;
        }
        return "預言家請睜眼，請選擇你要查驗的對象";
      }
      return "天黑請閉眼";
    }
    case "NIGHT_WITCH": {
      if (privateState.role === "WITCH" && isAlive) {
        const acted = !privateState.availableActions.includes("WITCH_ACTION");
        if (acted) {
          return "女巫請閉眼";
        }
        // Who the wolves killed is only revealed when she actually has an antidote decision to
        // make about it -- the server withholds tonightKilledPlayerId entirely once the antidote
        // is gone, so without one she's just asked about the poison (usable on anyone, regardless
        // of tonight's kill) with no claim made either way about who died or whether it was
        // peaceful.
        const hasAntidote = privateState.witch?.hasAntidote ?? false;
        const hasPoison = privateState.witch?.hasPoison ?? false;
        const killedName = hasAntidote ? playerName(publicState, privateState.witch?.tonightKilledPlayerId) : null;
        if (killedName) {
          return `女巫請睜眼，${killedName}被殺了，妳要使用解藥嗎？`;
        }
        // Only claim a peaceful night when we actually know that -- i.e. she still has the
        // antidote and there was genuinely no kill target, not merely because it was withheld.
        const knownPeaceful = hasAntidote ? "今晚是平安夜，" : "";
        if (hasPoison) {
          return `女巫請睜眼，${knownPeaceful}妳要使用毒藥嗎？`;
        }
        return `女巫請睜眼，${knownPeaceful}藥水已經用完，沒有其他行動`;
      }
      return "天黑請閉眼";
    }
    case "DAY_ANNOUNCEMENT":
    case "DAY_DISCUSSION": {
      const deaths = publicState.lastNightDeathPlayerIds;
      const deathText =
        deaths && deaths.length > 0
          ? `昨晚${deaths.map((id) => playerName(publicState, id) ?? id).join("、")}被殺了`
          : "昨晚是平安夜";
      const firstSpeakerId = publicState.discussionSpeakingOrder[0];
      const firstSpeakerName = playerName(publicState, firstSpeakerId);
      return firstSpeakerName ? `天亮了，${deathText}，這回合首先發言的是${firstSpeakerName}` : `天亮了，${deathText}`;
    }
    case "DAY_TIEBREAK_DISCUSSION": {
      const tiedNames = publicState.discussionSpeakingOrder.map((id) => playerName(publicState, id) ?? id);
      const firstSpeakerName = playerName(publicState, publicState.discussionSpeakingOrder[0]);
      return firstSpeakerName
        ? `投票平手，${tiedNames.join("、")}請再發言一次，首先發言的是${firstSpeakerName}`
        : "投票平手，請再發言一次";
    }
    case "HUNTER_SHOOT": {
      if (privateState.availableActions.includes("HUNTER_SHOOT")) {
        return "你已經死亡，要開槍帶走一名玩家嗎？";
      }
      const hunterName = playerName(publicState, publicState.pendingHunterShooterPlayerId);
      return hunterName ? `${hunterName}正在決定要不要開槍...` : null;
    }
    case "DAY_EXILE_RESULT": {
      const exiledName = playerName(publicState, publicState.exileResult?.exiledPlayerId);
      return exiledName ? `${exiledName}出局了` : "本輪無人出局";
    }
    case "DAY_LAST_WORDS": {
      if (privateState.availableActions.includes("END_LAST_WORDS")) {
        return "請留下你的遺言，說完後點自己的牌結束";
      }
      const speakerName = playerName(publicState, publicState.lastWordsPlayerId);
      return speakerName ? `${speakerName}正在留下遺言...` : null;
    }
    default:
      return null;
  }
}
