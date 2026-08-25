import { useEffect, useState } from "react";
import {
  CLIENT_EVENTS,
  FACTION_LABELS,
  NIGHT_ACTION_SECONDS,
  type PrivatePlayerState,
  type PublicRoomState,
} from "@kill-wolf/shared";
import { useSocket } from "../../lib/socketContext";
import { useAudio } from "../../lib/audio/audioContext";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PlayerCardTable, type PlayerCardTableExtraCard } from "../../components/PlayerCardTable";
import { TimeBar } from "../../components/TimeBar";

const ABSTAIN_ID = "__ABSTAIN__";
const WITCH_DECLINE_ID = "__WITCH_DECLINE__";
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

function seatNumberOf(publicState: PublicRoomState, playerId: string | null): number | null {
  if (!playerId) return null;
  const index = publicState.players.findIndex((p) => p.playerId === playerId);
  return index === -1 ? null : index + 1;
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
  // Whether the witch has clicked past the "use the antidote?" offer this night. Deliberately not
  // derived from privateState in an effect keyed on phase/night -- publicState and privateState
  // can arrive as separate updates, and snapshotting a derived step at the wrong moment would
  // permanently skip the save offer for the rest of the night. A plain "did they decline" flag
  // that only ever needs resetting to false each night avoids that race entirely.
  const [hasDeclinedSave, setHasDeclinedSave] = useState(false);
  // The knight's duel is available across several day phases at once, independent of whatever
  // else those phases offer (speaking turn, voting) -- a standing "declare duel" toggle rather
  // than one more phase-keyed branch below.
  const [knightDuelMode, setKnightDuelMode] = useState(false);

  useEffect(() => {
    setPendingConfirm(null);
    setHasDeclinedSave(false);
  }, [publicState.nightNumber]);

  useEffect(() => {
    if (!privateState.availableActions.includes("KNIGHT_DUEL")) {
      setKnightDuelMode(false);
    }
  }, [privateState.availableActions]);

  let selectableIds: Set<string> | undefined;
  let selectedIds: Set<string> | undefined;
  let highlightIds: Set<string> | undefined;
  let extraCard: PlayerCardTableExtraCard | null = null;
  let centerContent: string | null = null;
  let onSelect: ((id: string) => void) | undefined;
  let statusText: string | null = null;
  const showNightTimer =
    (publicState.phase === "NIGHT_GUARD" && privateState.role === "GUARD") ||
    (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF") ||
    (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER") ||
    (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") ||
    (publicState.phase === "HUNTER_SHOOT" && privateState.availableActions.includes("HUNTER_SHOOT"));

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
  } else if (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF") {
    const isConfirmed = privateState.werewolfConfirmedPlayerIds?.includes(selfPlayerId) ?? false;
    const votes = privateState.werewolfVotes ?? {};
    const myTargetId = votes[selfPlayerId];
    selectedIds = myTargetId ? new Set([myTargetId]) : undefined;
    // Every wolf's current pick is visible to the whole pack, not just their own -- highlight
    // teammates' chosen targets on the shared table (selectedIds already marks your own).
    const allyTargetIds = Object.entries(votes)
      .filter(([voterId]) => voterId !== selfPlayerId)
      .map(([, targetId]) => targetId);
    highlightIds = allyTargetIds.length > 0 ? new Set(allyTargetIds) : undefined;

    // Always visible regardless of whether you've confirmed yet, so you can keep watching what
    // the rest of the pack decides.
    const wolfLines = publicState.players
      .filter((p) => privateState.werewolfAllyPlayerIds?.includes(p.playerId) || p.playerId === selfPlayerId)
      .map((wolf) => {
        const targetId = votes[wolf.playerId];
        const confirmed = privateState.werewolfConfirmedPlayerIds?.includes(wolf.playerId) ?? false;
        const label = wolf.playerId === selfPlayerId ? `${wolf.name}（你）` : wolf.name;
        const choice = targetId ? `選擇 ${playerName(publicState, targetId)}${confirmed ? "（已確認）" : "（選擇中）"}` : "尚未選擇";
        return `${label}：${choice}`;
      });

    if (isConfirmed) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.WEREWOLF_UNCONFIRM_VOTE, { roomId });
      };
      statusText = `已確認，等待其他狼人確認...（點自己的牌可取消確認）　${wolfLines.join("　")}`;
    } else {
      selectableIds = new Set(alivePlayerIds);
      onSelect = (targetPlayerId) => {
        const targetName = playerName(publicState, targetPlayerId);
        setPendingConfirm({
          message: `確定要殺 ${targetName} 嗎？`,
          onConfirm: () => {
            playCue("sfx.wolf.confirm");
            socket.emit(CLIENT_EVENTS.WEREWOLF_VOTE, { roomId, targetPlayerId });
            socket.emit(CLIENT_EVENTS.WEREWOLF_CONFIRM_VOTE, { roomId });
            setPendingConfirm(null);
          },
        });
      };
      statusText = wolfLines.join("　");
    }
  } else if (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER") {
    // seerJustCheckedTonight above already covers the post-check state (and beyond, into
    // NIGHT_WITCH) -- reaching here at all means she hasn't checked yet tonight.
    selectableIds = new Set(alivePlayerIds.filter((id) => id !== selfPlayerId));
    onSelect = (targetPlayerId) => {
      const targetName = playerName(publicState, targetPlayerId);
      setPendingConfirm({
        message: `確定要查驗 ${targetName} 嗎？`,
        onConfirm: () => {
          socket.emit(CLIENT_EVENTS.SEER_CHECK, { roomId, targetPlayerId });
          setPendingConfirm(null);
        },
      });
    };
  } else if (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") {
    const canAct = privateState.availableActions.includes("WITCH_ACTION");
    const hasAntidote = privateState.witch?.hasAntidote ?? false;
    const hasPoison = privateState.witch?.hasPoison ?? false;
    const showSaveStep = canAct && Boolean(killedTonight) && hasAntidote && !hasDeclinedSave;

    if (!canAct) {
      statusText = "已行動，等待天亮...";
    } else if (showSaveStep && killedTonight) {
      highlightIds = new Set([killedTonight]);
      selectableIds = new Set([killedTonight]);
      extraCard = { id: WITCH_DECLINE_ID, label: "不使用解藥" };
      onSelect = (id) => {
        if (id === WITCH_DECLINE_ID) {
          setHasDeclinedSave(true);
          return;
        }
        const targetName = playerName(publicState, id);
        setPendingConfirm({
          message: `確定要救 ${targetName} 嗎？`,
          onConfirm: () => {
            playCue("sfx.witch.heal");
            socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SAVE", targetPlayerId: id });
            setPendingConfirm(null);
          },
        });
      };
      const killedName = playerName(publicState, killedTonight);
      statusText = `今晚 ${killedName} 被殺了，妳要使用解藥嗎？`;
    } else if (hasPoison) {
      selectableIds = new Set(alivePlayerIds);
      extraCard = { id: WITCH_DECLINE_ID, label: "結束行動" };
      onSelect = (id) => {
        if (id === WITCH_DECLINE_ID) {
          setPendingConfirm({
            message: "確定要放棄今晚行動嗎？",
            onConfirm: () => {
              socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SKIP" });
              setPendingConfirm(null);
            },
          });
          return;
        }
        const targetName = playerName(publicState, id);
        setPendingConfirm({
          message: `確定要毒殺 ${targetName} 嗎？`,
          onConfirm: () => {
            playCue("sfx.witch.poison");
            socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "POISON", targetPlayerId: id });
            setPendingConfirm(null);
          },
        });
      };
      // Who the wolves killed is only known here if she still has the antidote (declined earlier
      // this same night) -- without one at all, the server never sends tonightKilledPlayerId, so
      // don't imply anything about whether it was a peaceful night either.
      statusText = hasAntidote
        ? killedTonight
          ? `${playerName(publicState, killedTonight)}被殺了，妳要使用毒藥嗎？`
          : "今晚是平安夜，妳要使用毒藥嗎？"
        : "妳要使用毒藥嗎？";
    } else {
      extraCard = { id: WITCH_DECLINE_ID, label: "結束行動" };
      onSelect = (id) => {
        if (id === WITCH_DECLINE_ID) {
          setPendingConfirm({
            message: "確定要結束今晚行動嗎？",
            onConfirm: () => {
              socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SKIP" });
              setPendingConfirm(null);
            },
          });
        }
      };
      statusText = hasAntidote
        ? `${killedTonight ? `${playerName(publicState, killedTonight)}被殺了` : "今晚是平安夜"}，藥水已經用完，沒有其他行動。`
        : "藥水已經用完，沒有其他行動。";
    }
  } else if (publicState.phase === "DAY_DISCUSSION" || publicState.phase === "DAY_TIEBREAK_DISCUSSION") {
    centerContent = seatNumberOf(publicState, publicState.currentSpeakerPlayerId)?.toString() ?? null;
    const canSkip = privateState.availableActions.includes("SKIP_DAY_DISCUSSION");
    if (canSkip) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.SKIP_DAY_DISCUSSION, { roomId });
      };
      statusText = "輪到你發言了，說完後點自己的牌結束發言";
    }
  } else if (publicState.phase === "DAY_LAST_WORDS") {
    centerContent = seatNumberOf(publicState, publicState.lastWordsPlayerId)?.toString() ?? null;
    const canEnd = privateState.availableActions.includes("END_LAST_WORDS");
    if (canEnd) {
      selectableIds = new Set([selfPlayerId]);
      onSelect = (id) => {
        if (id === selfPlayerId) socket.emit(CLIENT_EVENTS.END_LAST_WORDS, { roomId });
      };
      statusText = "輪到你留下遺言了，說完後點自己的牌結束";
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

  return (
    <>
      {showNightTimer && <TimeBar endsAt={publicState.nightActionEndsAt} totalSeconds={NIGHT_ACTION_SECONDS} />}
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
        selectableIds={selectableIds}
        selectedIds={selectedIds}
        highlightIds={highlightIds}
        extraCard={extraCard}
        onSelect={onSelect}
      />
      {statusText && <p className="muted-text">{statusText}</p>}
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
