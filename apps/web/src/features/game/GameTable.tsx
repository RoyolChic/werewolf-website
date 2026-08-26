import { useEffect, useState } from "react";
import {
  CLIENT_EVENTS,
  FACTION_LABELS,
  ROLE_LABELS,
  getNightActionSeconds,
  type PrivatePlayerState,
  type PublicRoomState,
} from "@kill-wolf/shared";
import { useSocket } from "../../lib/socketContext";
import { useAudio } from "../../lib/audio/audioContext";
import { withBase } from "../../lib/assetPath";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PlayerCardTable, type PlayerCardSideAction, type PlayerCardTableExtraCard } from "../../components/PlayerCardTable";
import { TimeBar } from "../../components/TimeBar";

const ABSTAIN_ID = "__ABSTAIN__";
const WITCH_DECLINE_ID = "__WITCH_DECLINE__";
const WITCH_SAVE_POTION_ID = "__WITCH_SAVE_POTION__";
const WITCH_POISON_POTION_ID = "__WITCH_POISON_POTION__";
const HUNTER_DECLINE_ID = "__HUNTER_DECLINE__";
const KNIGHT_CANCEL_ID = "__KNIGHT_CANCEL__";

// The seer's check immediately advances the phase to NIGHT_WITCH server-side (see
// engine.ts#seerCheck), so by the time her own result reaches the client the room is already past
// NIGHT_SEER -- her reveal has to stay visible through both of these phases, not just the first.
const SEER_REVEAL_PHASES = new Set(["NIGHT_SEER", "NIGHT_WITCH"]);

interface GameTableProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

function playerName(publicState: PublicRoomState, playerId: string): string {
  return publicState.players.find((p) => p.playerId === playerId)?.name ?? playerId;
}

type PendingConfirm = { message: string; onConfirm: () => void };

/**
 * The single interactive card table for every in-game phase: picks which cards are clickable
 * and what a click does (kill vote, seer check, witch save/poison, day vote, ending your own
 * speaking turn), replacing the separate per-phase target lists and confirm buttons that used
 * to live in RoleActionPanel. Purely additive UI state (dialogs, whether the witch has declined
 * the save offer this night) lives here since it's the only place that needs it.
 */
export function GameTable({ publicState, privateState, selfPlayerId }: GameTableProps) {
  const socket = useSocket();
  const { playCue } = useAudio();
  const roomId = publicState.roomId;
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const killedTonight = privateState.witch?.tonightKilledPlayerId ?? null;
  // Which potion the witch has "armed" by clicking its icon beside her own card -- the next player
  // card click applies it, and nothing is sent to the server until then.
  const [witchArmedPotion, setWitchArmedPotion] = useState<"SAVE" | "POISON" | null>(null);
  // The knight's duel is available across several day phases at once, independent of whatever
  // else those phases offer (speaking turn, voting) -- a standing "declare duel" toggle rather
  // than one more phase-keyed branch below.
  const [knightDuelMode, setKnightDuelMode] = useState(false);
  // Click-again-to-confirm target for the seer's check, mirroring the werewolves' kill vote --
  // purely local since (unlike the wolves' shared vote) nobody else needs to see it.
  const [seerPendingTargetId, setSeerPendingTargetId] = useState<string | null>(null);

  useEffect(() => {
    setPendingConfirm(null);
    setWitchArmedPotion(null);
    setSeerPendingTargetId(null);
  }, [publicState.nightNumber]);

  useEffect(() => {
    if (!privateState.availableActions.includes("KNIGHT_DUEL")) {
      setKnightDuelMode(false);
    }
  }, [privateState.availableActions]);

  let selectableIds: Set<string> | undefined;
  let selectedIds: Set<string> | undefined;
  let highlightIds: Set<string> | undefined;
  let speakingIds: Set<string> | undefined;
  let cardBadges: Map<string, string> | undefined;
  let cardCaptions: Map<string, string> | undefined;
  let extraCard: PlayerCardTableExtraCard | null = null;
  let leftSideAction: PlayerCardSideAction | undefined;
  let rightSideAction: PlayerCardSideAction | undefined;
  let centerContent: string | null = null;
  let onSelect: ((id: string) => void) | undefined;
  let statusText: string | null = null;
  let isSelfTurn = false;
  const selfAlive = publicState.players.find((p) => p.playerId === selfPlayerId)?.isAlive ?? false;
  const showNightTimer =
    selfAlive &&
    ((publicState.phase === "NIGHT_GUARD" && privateState.role === "GUARD") ||
      (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF") ||
      (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER") ||
      (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") ||
      (publicState.phase === "HUNTER_SHOOT" && privateState.availableActions.includes("HUNTER_SHOOT")));

  const alivePlayerIds = publicState.players.filter((p) => p.isAlive).map((p) => p.playerId);

  const latestSeerCheck = privateState.role === "SEER" ? privateState.seerChecks?.at(-1) : undefined;
  const seerJustCheckedTonight =
    latestSeerCheck?.night === publicState.nightNumber && SEER_REVEAL_PHASES.has(publicState.phase);

  if (seerJustCheckedTonight && latestSeerCheck) {
    highlightIds = new Set([latestSeerCheck.targetPlayerId]);
    centerContent = FACTION_LABELS[latestSeerCheck.faction];
    const targetName = playerName(publicState, latestSeerCheck.targetPlayerId);
    statusText = `${targetName} 是 ${FACTION_LABELS[latestSeerCheck.faction]}（查驗結果已記錄在右下角「📜紀錄→我的紀錄」）`;
  } else if (publicState.phase === "NIGHT_GUARD" && privateState.role === "GUARD") {
    const canProtect = privateState.availableActions.includes("GUARD_PROTECT");
    if (canProtect) {
      const lastProtectedId = privateState.guard?.lastProtectedPlayerId ?? null;
      selectableIds = new Set(alivePlayerIds.filter((id) => id !== lastProtectedId));
      onSelect = (targetPlayerId) => {
        const targetName = playerName(publicState, targetPlayerId);
        setPendingConfirm({
          message: `確定要守護 ${targetName} 嗎？`,
          onConfirm: () => {
            playCue("sfx.guard.protect");
            socket.emit(CLIENT_EVENTS.GUARD_PROTECT, { roomId, targetPlayerId });
            setPendingConfirm(null);
          },
        });
      };
      statusText = lastProtectedId
        ? `昨晚守護了 ${playerName(publicState, lastProtectedId)}，今晚不能重複選擇`
        : "請選擇今晚要守護的對象";
    } else {
      statusText = "已守護，等待狼人行動...";
    }
  } else if (publicState.phase === "HUNTER_SHOOT" && privateState.availableActions.includes("HUNTER_SHOOT")) {
    selectableIds = new Set(alivePlayerIds.filter((id) => id !== selfPlayerId));
    extraCard = { id: HUNTER_DECLINE_ID, label: "不開槍" };
    onSelect = (id) => {
      if (id === HUNTER_DECLINE_ID) {
        setPendingConfirm({
          message: "確定不開槍嗎？",
          onConfirm: () => {
            socket.emit(CLIENT_EVENTS.HUNTER_SHOOT, { roomId, targetPlayerId: null });
            setPendingConfirm(null);
          },
        });
        return;
      }
      const targetName = playerName(publicState, id);
      setPendingConfirm({
        message: `確定要開槍殺死 ${targetName} 嗎？`,
        onConfirm: () => {
          playCue("sfx.hunter.shot");
          socket.emit(CLIENT_EVENTS.HUNTER_SHOOT, { roomId, targetPlayerId: id });
          setPendingConfirm(null);
        },
      });
    };
    statusText = "你已死亡，要開槍帶走一名玩家嗎？";
  } else if (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF" && selfAlive) {
    const isConfirmed = privateState.werewolfConfirmedPlayerIds?.includes(selfPlayerId) ?? false;
    const votes = privateState.werewolfVotes ?? {};
    const myTargetId = votes[selfPlayerId];
    selectedIds = myTargetId ? new Set([myTargetId]) : undefined;

    // Teammates' identities are revealed the same way the seer's check result is highlighted --
    // a colored outline -- but labeled individually under each teammate's own card rather than
    // one shared label in the middle of the table.
    const allyIds = privateState.werewolfAllyPlayerIds ?? [];
    if (allyIds.length > 0) {
      highlightIds = new Set(allyIds);
      cardCaptions = new Map(allyIds.map((id) => [id, "狼隊友"]));
    }

    // Only the pack can see this table at all, so it's safe to show exactly which seat numbers
    // are currently aiming at which target -- a small badge on each targeted card, mirroring the
    // "N 人選擇中" count shown during card picking, but with real identities since wolves already
    // know each other.
    const votesByTarget = new Map<string, string[]>();
    for (const [voterId, targetId] of Object.entries(votes)) {
      const seatNumber = publicState.players.findIndex((p) => p.playerId === voterId) + 1;
      if (seatNumber <= 0) continue;
      const seats = votesByTarget.get(targetId) ?? [];
      seats.push(String(seatNumber));
      votesByTarget.set(targetId, seats);
    }
    cardBadges = new Map([...votesByTarget.entries()].map(([targetId, seats]) => [targetId, seats.join("、")]));

    if (isConfirmed) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.WEREWOLF_UNCONFIRM_VOTE, { roomId });
      };
      statusText = "已確認，等待其他狼人確認...（點自己的牌可取消確認）";
    } else {
      // Same click-again-to-lock-in pattern as the initial card pick: the first click on a card
      // just marks it as the pending target (like choosing a face-down card); clicking that same
      // card again is what actually confirms it (like the "確認這張牌" step) -- no popup modal.
      selectableIds = new Set(alivePlayerIds);
      onSelect = (targetPlayerId) => {
        if (targetPlayerId === myTargetId) {
          playCue("sfx.wolf.confirm");
          socket.emit(CLIENT_EVENTS.WEREWOLF_CONFIRM_VOTE, { roomId });
          return;
        }
        playCue("ui.vote.select");
        socket.emit(CLIENT_EVENTS.WEREWOLF_VOTE, { roomId, targetPlayerId });
      };
      statusText = myTargetId
        ? `已選擇 ${playerName(publicState, myTargetId)}，點選兩下確認襲擊對象`
        : "點選兩下確認襲擊對象";
    }
  } else if (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER" && selfAlive) {
    // seerJustCheckedTonight above already covers the post-check state (and beyond, into
    // NIGHT_WITCH) -- reaching here at all means she hasn't checked yet tonight.
    selectableIds = new Set(alivePlayerIds.filter((id) => id !== selfPlayerId));
    selectedIds = seerPendingTargetId ? new Set([seerPendingTargetId]) : undefined;
    // Same click-again-to-lock-in pattern as the werewolves' kill vote: the first click just
    // marks the pending target, clicking that same card again confirms it -- no popup modal.
    onSelect = (targetPlayerId) => {
      if (targetPlayerId === seerPendingTargetId) {
        socket.emit(CLIENT_EVENTS.SEER_CHECK, { roomId, targetPlayerId });
        setSeerPendingTargetId(null);
        return;
      }
      setSeerPendingTargetId(targetPlayerId);
    };
    statusText = seerPendingTargetId
      ? `已選擇 ${playerName(publicState, seerPendingTargetId)}，點選兩下確認查驗對象`
      : "點選兩下確認查驗對象";
  } else if (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") {
    const canAct = privateState.availableActions.includes("WITCH_ACTION");
    const hasAntidote = privateState.witch?.hasAntidote ?? false;
    const hasPoison = privateState.witch?.hasPoison ?? false;
    // "{name}被殺了" reads as background chatter when the name is her own -- calling it out as
    // "妳" instead makes it register as something she needs to react to, not just narration.
    const killedDescription = killedTonight
      ? killedTonight === selfPlayerId
        ? "妳"
        : playerName(publicState, killedTonight)
      : null;

    if (!canAct) {
      statusText = "已行動，等待天亮...";
    } else if (!hasAntidote && !hasPoison) {
      isSelfTurn = true;
      extraCard = { id: WITCH_DECLINE_ID, label: "結束行動" };
      onSelect = (id) => {
        if (id === WITCH_DECLINE_ID) {
          socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SKIP" });
        }
      };
      statusText = killedDescription
        ? `${killedDescription}被殺了，藥水已經用完，沒有其他行動。`
        : "藥水已經用完，沒有其他行動。";
    } else {
      isSelfTurn = true;
      // Both potions are offered side by side beside her own card -- clicking one "arms" it
      // (enlarges + glows), and the next player card click applies that armed potion to them.
      // Clicking an armed potion again disarms it without sending anything to the server.
      const canSave = hasAntidote && Boolean(killedTonight);
      leftSideAction = {
        id: WITCH_SAVE_POTION_ID,
        icon: <img src={withBase("/potions/antidote.png")} alt="解藥" className="game-potion-image" />,
        label: "解藥",
        armed: witchArmedPotion === "SAVE",
        disabled: !canSave,
      };
      rightSideAction = {
        id: WITCH_POISON_POTION_ID,
        icon: <img src={withBase("/potions/poison.png")} alt="毒藥" className="game-potion-image" />,
        label: "毒藥",
        armed: witchArmedPotion === "POISON",
        disabled: !hasPoison,
      };
      highlightIds = killedTonight ? new Set([killedTonight]) : undefined;
      if (witchArmedPotion === "SAVE" && killedTonight) {
        selectableIds = new Set([killedTonight]);
      } else if (witchArmedPotion === "POISON") {
        selectableIds = new Set(alivePlayerIds);
      }
      extraCard = { id: WITCH_DECLINE_ID, label: "結束行動" };
      onSelect = (id) => {
        if (id === WITCH_SAVE_POTION_ID) {
          setWitchArmedPotion((prev) => (prev === "SAVE" ? null : "SAVE"));
          return;
        }
        if (id === WITCH_POISON_POTION_ID) {
          setWitchArmedPotion((prev) => (prev === "POISON" ? null : "POISON"));
          return;
        }
        if (id === WITCH_DECLINE_ID) {
          setPendingConfirm({
            message: "確定要結束今晚行動嗎？",
            onConfirm: () => {
              socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SKIP" });
              setPendingConfirm(null);
            },
          });
          return;
        }
        const targetName = id === selfPlayerId ? "自己" : playerName(publicState, id);
        if (witchArmedPotion === "SAVE") {
          setPendingConfirm({
            message: `確定要救 ${targetName} 嗎？`,
            onConfirm: () => {
              playCue("sfx.witch.heal");
              socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SAVE", targetPlayerId: id });
              setPendingConfirm(null);
              setWitchArmedPotion(null);
            },
          });
        } else if (witchArmedPotion === "POISON") {
          setPendingConfirm({
            message: `確定要毒殺 ${targetName} 嗎？`,
            onConfirm: () => {
              playCue("sfx.witch.poison");
              socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "POISON", targetPlayerId: id });
              setPendingConfirm(null);
              setWitchArmedPotion(null);
            },
          });
        }
      };
      if (witchArmedPotion) {
        // Once a potion is armed, the prompt shifts from "pick a potion" to reminding her that
        // the next step is clicking the target's card -- otherwise it's easy to leave the potion
        // armed and glowing without realizing a second click is still needed.
        const armedLabel = witchArmedPotion === "SAVE" ? "解藥" : "毒藥";
        statusText = `已選擇${armedLabel}，請點選卡片決定要執行的對象`;
      } else {
        // Who the wolves killed is only known here if she still has the antidote -- without one at
        // all, the server never sends tonightKilledPlayerId, so don't imply anything about whether
        // it was a peaceful night either.
        statusText = killedDescription
          ? `${killedDescription}被殺死了，點選藥水後選擇你要執行的對象`
          : hasAntidote
            ? "今晚是平安夜，點選藥水後選擇你要執行的對象"
            : "點選藥水後選擇你要執行的對象";
      }
    }
  } else if (publicState.phase === "DAY_DISCUSSION" || publicState.phase === "DAY_TIEBREAK_DISCUSSION") {
    speakingIds = publicState.currentSpeakerPlayerId ? new Set([publicState.currentSpeakerPlayerId]) : undefined;
    const canSkip = privateState.availableActions.includes("SKIP_DAY_DISCUSSION");
    if (canSkip) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.SKIP_DAY_DISCUSSION, { roomId });
      };
      statusText = "輪到你發言了，說完後點自己的牌結束發言";
      isSelfTurn = true;
    }
  } else if (publicState.phase === "DAY_LAST_WORDS") {
    speakingIds = publicState.lastWordsPlayerId ? new Set([publicState.lastWordsPlayerId]) : undefined;
    const canEnd = privateState.availableActions.includes("END_LAST_WORDS");
    if (canEnd) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.END_LAST_WORDS, { roomId });
      };
      statusText = "輪到你留下遺言了，說完後點自己的牌結束";
      isSelfTurn = true;
    } else {
      const speakerId = publicState.lastWordsPlayerId;
      statusText = speakerId ? `${playerName(publicState, speakerId)}正在留下遺言...` : null;
    }
  } else if (publicState.phase === "DAY_VOTE") {
    const canVote = privateState.availableActions.includes("DAY_VOTE");
    if (canVote) {
      selectableIds = new Set(alivePlayerIds.filter((id) => id !== selfPlayerId));
      extraCard = { id: ABSTAIN_ID, label: "棄票" };
      onSelect = (id) => {
        playCue("ui.vote.confirm");
        socket.emit(CLIENT_EVENTS.DAY_VOTE, { roomId, targetPlayerId: id === ABSTAIN_ID ? null : id });
      };
    } else {
      statusText = "已投票，等待其他玩家...";
    }
  }

  // The knight's once-per-game duel can be declared during any of the day phases above,
  // independent of whatever else is going on there -- it takes over the table entirely once
  // active, replacing that phase's own selection/extra-card with its own.
  const canDeclareKnightDuel = privateState.availableActions.includes("KNIGHT_DUEL");
  if (knightDuelMode) {
    selectableIds = new Set(alivePlayerIds.filter((id) => id !== selfPlayerId));
    extraCard = { id: KNIGHT_CANCEL_ID, label: "取消決鬥" };
    onSelect = (id) => {
      if (id === KNIGHT_CANCEL_ID) {
        setKnightDuelMode(false);
        return;
      }
      const targetName = playerName(publicState, id);
      setPendingConfirm({
        message: `確定要與 ${targetName} 決鬥嗎？如果對方是狼人，你會直接擊殺對方；如果對方是好人，你會以死謝罪。決鬥後將直接進入夜晚。`,
        onConfirm: () => {
          playCue("sfx.knight.draw_sword");
          socket.emit(CLIENT_EVENTS.KNIGHT_DUEL, { roomId, targetPlayerId: id });
          setPendingConfirm(null);
          setKnightDuelMode(false);
        },
      });
    };
    statusText = "請選擇要決鬥的對象";
  }

  // A dead viewer never gets to act, no matter what the branches above computed for their old
  // role -- and their deadViewMode picks what they get to see instead: nothing beyond ordinary
  // phase status text ("HIDDEN"), or every player's actual role as a caption on their card ("FULL").
  if (!selfAlive) {
    selectableIds = undefined;
    onSelect = undefined;
    extraCard = null;
    leftSideAction = undefined;
    rightSideAction = undefined;
    cardBadges = undefined;
    isSelfTurn = false;
    if (privateState.deadViewMode === "FULL" && privateState.spectatorRevealedRoles) {
      cardCaptions = new Map(
        Object.entries(privateState.spectatorRevealedRoles).map(([id, role]) => [id, ROLE_LABELS[role]]),
      );
      highlightIds = undefined;
      statusText = "觀戰中，可看見所有人的身分";
    } else {
      cardCaptions = undefined;
      statusText = "觀戰中...";
    }
  }

  return (
    <>
      {showNightTimer && (
        <TimeBar endsAt={publicState.nightActionEndsAt} totalSeconds={getNightActionSeconds(publicState.phase)} />
      )}
      {canDeclareKnightDuel && !knightDuelMode && (
        <Button variant="danger" onClick={() => setKnightDuelMode(true)}>
          ⚔️ 發動決鬥
        </Button>
      )}
      <PlayerCardTable
        key={publicState.phase}
        players={publicState.players}
        selfPlayerId={selfPlayerId}
        selfRole={privateState.role}
        selfRoleVariantIndex={privateState.roleImageVariantIndex}
        centerContent={centerContent}
        statusText={statusText}
        selectableIds={selectableIds}
        selectedIds={selectedIds}
        highlightIds={highlightIds}
        speakingIds={speakingIds}
        cardBadges={cardBadges}
        cardCaptions={cardCaptions}
        extraCard={extraCard}
        leftSideAction={leftSideAction}
        rightSideAction={rightSideAction}
        onSelect={onSelect}
        isSelfTurn={isSelfTurn}
      />
      {pendingConfirm && (
        <ConfirmDialog
          message={pendingConfirm.message}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={pendingConfirm.onConfirm}
        />
      )}
    </>
  );
}
