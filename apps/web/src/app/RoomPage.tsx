import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { Button } from "../components/Button";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { DEFAULT_BACKGROUND_PATH, PHASE_BACKGROUND_PATH } from "../lib/phaseBackground";
import { PhaseView } from "./PhaseView";

export function RoomPage() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const connection = useRoomConnection(roomId);
  const [nameInput, setNameInput] = useState("");

  let content: ReactNode;
  let backgroundPath = DEFAULT_BACKGROUND_PATH;

  if (connection.status === "CONNECTING") {
    content = <div className="page centered">連線中...</div>;
  } else if (connection.status === "ERROR") {
    content = (
      <div className="page centered">
        <p className="error-text">{connection.errorMessage ?? "發生錯誤"}</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  } else if (connection.status === "KICKED") {
    content = (
      <div className="page centered">
        <p>你已被房主移出房間</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  } else if (connection.status === "CLOSED") {
    content = (
      <div className="page centered">
        <p>房間已關閉</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  } else if (connection.status === "NEEDS_NAME") {
    content = (
      <div className="page centered">
        <h1>加入房間 {roomId}</h1>
        <label className="field">
          <span>你的名稱</span>
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} maxLength={16} />
        </label>
        <Button onClick={() => connection.joinWithName(nameInput.trim())} disabled={!nameInput.trim()}>
          加入
        </Button>
        {connection.errorMessage && <p className="error-text">{connection.errorMessage}</p>}
      </div>
    );
  } else if (connection.status === "NEEDS_RECONNECT_CONFIRM") {
    content = (
      <div className="page centered">
        <p>偵測到此名稱有離線玩家，是否要恢復該身份？</p>
        <Button onClick={connection.confirmReconnectIdentity}>是，恢復我的身份</Button>
      </div>
    );
  } else {
    const { publicState, privateState, selfPlayerId, lastActionError } = connection;

    if (!publicState || !privateState || !selfPlayerId) {
      content = <div className="page centered">載入房間狀態中...</div>;
    } else {
      backgroundPath = PHASE_BACKGROUND_PATH[publicState.phase];
      content = (
        <div className="page room-page">
          {lastActionError && <div className="toast">{lastActionError}</div>}
          <PhaseView publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
        </div>
      );
    }
  }

  return (
    <>
      <SceneBackdrop imagePath={backgroundPath} />
      {content}
    </>
  );
}
