import { useState, type ReactNode } from "react";
import { CLIENT_EVENTS, FACTION_LABELS, type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { useSocket } from "../../lib/socketContext";
import { Button } from "../../components/Button";

interface RoleActionPanelProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

function alivePlayersExcept(publicState: PublicRoomState, excludeId?: string) {
  return publicState.players.filter((p) => p.isAlive && p.playerId !== excludeId);
}

function playerName(publicState: PublicRoomState, playerId: string): string {
  return publicState.players.find((p) => p.playerId === playerId)?.name ?? playerId;
}

/**
 * The seer's own check history matters long after NIGHT_SEER ends -- they need to recall it
 * during day discussion -- so it's shown on every phase once they have at least one result,
 * not just transiently while canCheck is false during the instant of NIGHT_SEER itself.
 */
function SeerHistory({ publicState, privateState }: { publicState: PublicRoomState; privateState: PrivatePlayerState }) {
  if (privateState.role !== "SEER" || !privateState.seerChecks || privateState.seerChecks.length === 0) {
    return null;
  }
  return (
    <section className="card">
      <h2>預言家查驗紀錄</h2>
      <ul className="action-target-list">
        {privateState.seerChecks.map((check) => (
          <li key={check.night}>
            第 {check.night} 夜：{playerName(publicState, check.targetPlayerId)} 是 {FACTION_LABELS[check.faction]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WerewolfNightPanel({ publicState, privateState, selfPlayerId, roomId }: RoleActionPanelProps & { roomId: string }) {
  const socket = useSocket();
  const canVote = privateState.availableActions.includes("WEREWOLF_VOTE");
  const votes = privateState.werewolfVotes ?? {};
  const werewolves = publicState.players.filter(
    (p) => privateState.werewolfAllyPlayerIds?.includes(p.playerId) || p.playerId === selfPlayerId,
  );

  return (
    <section className="card">
      <h2>狼人擊殺</h2>
      <p>
        你的隊友：
        {privateState.werewolfAllyPlayerIds?.map((id) => playerName(publicState, id)).join("、") || "無"}
      </p>
      <ul className="action-target-list">
        {werewolves.map((wolf) => {
          const targetId = votes[wolf.playerId];
          return (
            <li key={wolf.playerId}>
              {wolf.name}
              {wolf.playerId === selfPlayerId ? "（你）" : ""}：
              {targetId ? `投給 ${playerName(publicState, targetId)}` : "尚未投票"}
            </li>
          );
        })}
      </ul>
      {canVote ? (
        <div className="action-target-list">
          {alivePlayersExcept(publicState).map((p) => (
            <Button
              key={p.playerId}
              variant="danger"
              onClick={() => socket.emit(CLIENT_EVENTS.WEREWOLF_VOTE, { roomId, targetPlayerId: p.playerId })}
            >
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

function SeerNightPanel({ publicState, privateState, selfPlayerId, roomId }: RoleActionPanelProps & { roomId: string }) {
  const socket = useSocket();
  const canCheck = privateState.availableActions.includes("SEER_CHECK");

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
        <p>已查驗，等待女巫行動...</p>
      )}
    </section>
  );
}

function WitchNightPanel({ publicState, privateState, roomId }: RoleActionPanelProps & { roomId: string }) {
  const socket = useSocket();
  const [poisonTarget, setPoisonTarget] = useState("");
  const canAct = privateState.availableActions.includes("WITCH_ACTION");
  const killed = privateState.witch?.tonightKilledPlayerId;
  const killedName = killed ? playerName(publicState, killed) : null;

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

function DayDiscussionPanel({ publicState, privateState, roomId }: RoleActionPanelProps & { roomId: string }) {
  const socket = useSocket();
  const canSkip = privateState.availableActions.includes("SKIP_DAY_DISCUSSION");
  const currentSpeakerId = publicState.currentSpeakerPlayerId;
  const currentSpeakerName = currentSpeakerId ? playerName(publicState, currentSpeakerId) : null;
  const upcoming = publicState.discussionSpeakingOrder
    .slice(publicState.discussionSpeakingOrder.indexOf(currentSpeakerId ?? "") + 1)
    .map((id) => playerName(publicState, id));

  return (
    <section className="card">
      <h2>白天討論</h2>
      <p>目前發言：{currentSpeakerName ?? "-"}</p>
      {upcoming.length > 0 && <p className="muted-text">接下來：{upcoming.join("、")}</p>}
      <Button variant="secondary" disabled={!canSkip} onClick={() => socket.emit(CLIENT_EVENTS.SKIP_DAY_DISCUSSION, { roomId })}>
        {canSkip ? "結束我的發言" : "等待對方發言結束..."}
      </Button>
    </section>
  );
}

function DayVotePanel({ publicState, privateState, selfPlayerId, roomId }: RoleActionPanelProps & { roomId: string }) {
  const socket = useSocket();
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

function renderPhaseContent(props: RoleActionPanelProps & { roomId: string }): ReactNode {
  const { publicState, privateState } = props;

  if (publicState.phase === "NIGHT_WEREWOLF" && privateState.role === "WEREWOLF") {
    return <WerewolfNightPanel {...props} />;
  }
  if (publicState.phase === "NIGHT_SEER" && privateState.role === "SEER") {
    return <SeerNightPanel {...props} />;
  }
  if (publicState.phase === "NIGHT_WITCH" && privateState.role === "WITCH") {
    return <WitchNightPanel {...props} />;
  }
  if (publicState.phase.startsWith("NIGHT")) {
    return (
      <section className="card">
        <p>夜晚降臨，請等待...</p>
      </section>
    );
  }
  if (publicState.phase === "DAY_DISCUSSION") {
    return <DayDiscussionPanel {...props} />;
  }
  if (publicState.phase === "DAY_VOTE") {
    return <DayVotePanel {...props} />;
  }
  return (
    <section className="card">
      <p>等待遊戲繼續...</p>
    </section>
  );
}

export function RoleActionPanel(props: RoleActionPanelProps) {
  const { publicState, privateState, selfPlayerId } = props;
  const roomId = publicState.roomId;
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);

  if (!self) return null;

  if (!self.isAlive) {
    return <DeadPlayerPanel publicState={publicState} privateState={privateState} roomId={roomId} />;
  }

  return (
    <>
      <SeerHistory publicState={publicState} privateState={privateState} />
      {renderPhaseContent({ ...props, roomId })}
    </>
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
  const socket = useSocket();
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
