import { useState } from "react";
import { CLIENT_EVENTS, type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { useSocket } from "../../lib/socketContext";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { RoleInfoPanel } from "../../components/RoleInfoPanel";
import { getNarratorLine } from "./narratorLines";
import { GameTable } from "./GameTable";

interface RoleActionPanelProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

// Day-phase lines (death/exile recap, first speaker) are shown once already, up in
// PublicGamePanel -- this only covers the role-specific "please open/close your eyes" lines.
const DAY_PHASES = new Set([
  "DAY_ANNOUNCEMENT",
  "DAY_DISCUSSION",
  "DAY_TIEBREAK_DISCUSSION",
  "DAY_EXILE_RESULT",
  "DAY_LAST_WORDS",
]);

function NarratorLine({ publicState, privateState, selfPlayerId }: RoleActionPanelProps) {
  if (DAY_PHASES.has(publicState.phase)) return null;
  const line = getNarratorLine(publicState, privateState, selfPlayerId);
  if (!line) return null;
  return <p className="narrator-line">{line}</p>;
}

/**
 * The seer's own check history lives in the log panel (see GameLogPanel), not on the main
 * screen -- this is just a standing pointer so she doesn't forget where to look for it.
 */
function SeerLogHint({ privateState }: { privateState: PrivatePlayerState }) {
  if (privateState.role !== "SEER") return null;
  return <p className="muted-text">🔍 你的查驗結果都記錄在右下角「📜紀錄→我的紀錄」</p>;
}

function RoleInfoButton({
  role,
  variantIndex,
}: {
  role: NonNullable<PrivatePlayerState["role"]>;
  variantIndex: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" className="role-info-button" onClick={() => setOpen(true)}>
        查看角色說明
      </Button>
      {open && (
        <Modal>
          <RoleInfoPanel role={role} variantIndex={variantIndex} />
          <Button onClick={() => setOpen(false)}>關閉</Button>
        </Modal>
      )}
    </>
  );
}

export function RoleActionPanel(props: RoleActionPanelProps) {
  const { publicState, privateState, selfPlayerId } = props;
  const roomId = publicState.roomId;
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);

  if (!self) return null;

  // A hunter is already dead by the time HUNTER_SHOOT starts -- that's what makes them eligible
  // to shoot -- so they still need the full interactive table, not the dead-player panel.
  const hasPendingAction = privateState.availableActions.length > 0;
  if (!self.isAlive && !hasPendingAction) {
    return (
      <>
        <DeadPlayerPanel privateState={privateState} roomId={roomId} />
        <GameTable publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
      </>
    );
  }

  return (
    <>
      <NarratorLine {...props} />
      {privateState.role && (
        <RoleInfoButton role={privateState.role} variantIndex={privateState.roleImageVariantIndex} />
      )}
      <SeerLogHint privateState={privateState} />
      <GameTable publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
    </>
  );
}

/**
 * A dead player keeps watching the live table below this (see GameTable's own !selfAlive branch)
 * so they stay part of the room instead of staring at a blank "you died" screen -- this bar just
 * lets them pick whether they want role identities spoiled while they spectate.
 */
function DeadPlayerPanel({
  privateState,
  roomId,
}: {
  privateState: PrivatePlayerState;
  roomId: string;
}) {
  const socket = useSocket();
  const setMode = (mode: "HIDDEN" | "FULL") =>
    socket.emit(CLIENT_EVENTS.SET_DEAD_VIEW_MODE, { roomId, mode });

  return (
    <section className="card dead-player-panel">
      <div className="dead-player-panel-row">
        <span className="dead-player-panel-label">💀 你已死亡，正在觀戰</span>
        <div className="dead-view-toggle" role="group" aria-label="觀戰模式">
          <button
            type="button"
            className={`dead-view-toggle-btn${privateState.deadViewMode === "HIDDEN" ? " dead-view-toggle-btn-active" : ""}`}
            onClick={() => setMode("HIDDEN")}
          >
            🙈 不知道身分
          </button>
          <button
            type="button"
            className={`dead-view-toggle-btn${privateState.deadViewMode === "FULL" ? " dead-view-toggle-btn-active" : ""}`}
            onClick={() => setMode("FULL")}
          >
            🔍 查看所有身分
          </button>
        </div>
        {privateState.role && (
          <RoleInfoButton role={privateState.role} variantIndex={privateState.roleImageVariantIndex} />
        )}
      </div>
    </section>
  );
}
