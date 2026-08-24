import { useState } from "react";
import { CLIENT_EVENTS, FACTION_LABELS, type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { getSocket } from "../../lib/socketClient";
import { Button } from "../../components/Button";

interface RoleActionPanelProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

function alivePlayersExcept(publicState: PublicRoomState, excludeId?: string) {
  return publicState.players.filter((p) => p.isAlive && p.playerId !== excludeId);
}

export function RoleActionPanel({ publicState, privateState, selfPlayerId }: RoleActionPanelProps) {
  const roomId = publicState.roomId;
  const socket = getSocket();
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);
  const [poisonTarget, setPoisonTarget] = useState<string>("");

  if (!self) return null;

  if (!self.isAlive) {
    return <DeadPlayerPanel publicState={publicState} privateState={privateState} roomId={roomId} />;
  }

  if (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF") {
    const canVote = privateState.availableActions.includes("WEREWOLF_VOTE");
    return (
      <section className="card">
        <h2>狼人擊殺</h2>
        <p>你的隊友：{privateState.werewolfAllyPlayerIds?.map((id) => publicState.players.find((p) => p.playerId === id)?.name).join("、") || "無"}</p>
        {canVote ? (
          <div className="action-target-list">
            {alivePlayersExcept(publicState).map((p) => (
              <Button key={p.playerId} variant="danger" onClick={() => socket.emit(CLIENT_EVENTS.WEREWOLF_VOTE, { roomId, targetPlayerId: p.playerId })}>
                擊殺 {p.name}
              </Button>
            ))}
          </div>
        ) : (
          <p>已投票，等待其他狼人...</p>
        )}
      </section>
    );
  }

  if (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER") {
    const canCheck = privateState.availableActions.includes("SEER_CHECK");
    const lastCheck = privateState.seerChecks?.[privateState.seerChecks.length - 1];
    return (
      <section className="card">
        <h2>預言家查驗</h2>
        {canCheck ? (
          <div className="action-target-list">
            {alivePlayersExcept(publicState, selfPlayerId).map((p) => (
              <Button key={p.playerId} onClick={() => socket.emit(CLIENT_EVENTS.SEER_CHECK, { roomId, targetPlayerId: p.playerId })}>
                查驗 {p.name}
              </Button>
            ))}
          </div>
        ) : (
          <p>
            {lastCheck
              ? `查驗結果：${publicState.players.find((p) => p.playerId === lastCheck.targetPlayerId)?.name} 是 ${FACTION_LABELS[lastCheck.faction]}`
              : "等待中..."}
          </p>
        )}
      </section>
    );
  }

  if (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") {
    const canAct = privateState.availableActions.includes("WITCH_ACTION");
    const killed = privateState.witch?.tonightKilledPlayerId;
    const killedName = killed ? publicState.players.find((p) => p.playerId === killed)?.name : null;
    return (
      <section className="card">
        <h2>女巫行動</h2>
        <p>{killedName ? `今晚被擊殺：${killedName}` : "今晚無人被擊殺"}</p>
        {canAct ? (
          <div className="witch-actions">
            {killed && privateState.witch?.hasAntidote && (
              <Button onClick={() => socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SAVE", targetPlayerId: killed })}>
                使用解藥救 {killedName}
              </Button>
            )}
            {privateState.witch?.hasPoison && (
              <div className="action-target-list">
                <select value={poisonTarget} onChange={(e) => setPoisonTarget(e.target.value)}>
                  <option value="">選擇毒殺目標</option>
                  {alivePlayersExcept(publicState).map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="danger"
                  disabled={!poisonTarget}
                  onClick={() => socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "POISON", targetPlayerId: poisonTarget })}
                >
                  使用毒藥
                </Button>
              </div>
            )}
            <Button variant="secondary" onClick={() => socket.emit(CLIENT_EVENTS.WITCH_ACTION, { roomId, action: "SKIP" })}>
              跳過
            </Button>
          </div>
        ) : (
          <p>已行動，等待天亮...</p>
        )}
      </section>
    );
  }

  if (publicState.phase.startsWith("NIGHT")) {
    return (
      <section className="card">
        <p>夜晚降臨，請等待...</p>
      </section>
    );
  }

  if (publicState.phase === "DAY_DISCUSSION") {
    const canSkip = privateState.availableActions.includes("SKIP_DAY_DISCUSSION");
    return (
      <section className="card">
        <h2>白天討論</h2>
        <p>{publicState.discussionSkipRequesterIds.length} / {publicState.players.filter((p) => p.isAlive).length} 人已跳過</p>
        <Button variant="secondary" disabled={!canSkip} onClick={() => socket.emit(CLIENT_EVENTS.SKIP_DAY_DISCUSSION, { roomId })}>
          {canSkip ? "跳過發言" : "已跳過"}
        </Button>
      </section>
    );
  }

  if (publicState.phase === "DAY_VOTE") {
    const canVote = privateState.availableActions.includes("DAY_VOTE");
    return (
      <section className="card">
        <h2>白天投票</h2>
        {canVote ? (
          <div className="action-target-list">
            {alivePlayersExcept(publicState, selfPlayerId).map((p) => (
              <Button key={p.playerId} onClick={() => socket.emit(CLIENT_EVENTS.DAY_VOTE, { roomId, targetPlayerId: p.playerId })}>
                投票放逐 {p.name}
              </Button>
            ))}
            <Button variant="secondary" onClick={() => socket.emit(CLIENT_EVENTS.DAY_VOTE, { roomId, targetPlayerId: null })}>
              棄票
            </Button>
          </div>
        ) : (
          <p>已投票，等待其他玩家...</p>
        )}
      </section>
    );
  }

  return (
    <section className="card">
      <p>等待遊戲繼續...</p>
    </section>
  );
}

function DeadPlayerPanel({
  publicState,
  privateState,
  roomId,
}: {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  roomId: string;
}) {
  const socket = getSocket();
  return (
    <section className="card">
      <p>你已死亡</p>
      <label className="field">
        <span>觀看模式</span>
        <select
          value={privateState.deadViewMode}
          onChange={(e) => socket.emit(CLIENT_EVENTS.SET_DEAD_VIEW_MODE, { roomId, mode: e.target.value })}
        >
          <option value="HIDDEN">不看遊戲流程</option>
          <option value="FULL">看完整遊戲流程</option>
        </select>
      </label>
      {privateState.deadViewMode === "HIDDEN" && <p>等待遊戲結束...</p>}
    </section>
  );
}
