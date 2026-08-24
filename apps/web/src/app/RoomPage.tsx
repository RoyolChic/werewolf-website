import { useState } from "react";
import { useParams } from "react-router-dom";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { Button } from "../components/Button";
import { PhaseView } from "./PhaseView";

export function RoomPage() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const connection = useRoomConnection(roomId);
  const [nameInput, setNameInput] = useState("");

  if (connection.status === "CONNECTING") {
    return <div className="page centered">連線中...</div>;
  }

  if (connection.status === "ERROR") {
    return (
      <div className="page centered">
        <p className="error-text">{connection.errorMessage ?? "發生錯誤"}</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  }

  if (connection.status === "KICKED") {
    return (
      <div className="page centered">
        <p>你已被房主移出房間</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  }

  if (connection.status === "CLOSED") {
    return (
      <div className="page centered">
        <p>房間已關閉</p>
        <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
      </div>
    );
  }

  if (connection.status === "NEEDS_NAME") {
    return (
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
  }

  if (connection.status === "NEEDS_RECONNECT_CONFIRM") {
    return (
      <div className="page centered">
        <p>偵測到此名稱有離線玩家，是否要恢復該身份？</p>
        <Button onClick={connection.confirmReconnectIdentity}>是，恢復我的身份</Button>
      </div>
    );
  }

  const { publicState, privateState, selfPlayerId, lastActionError } = connection;

  if (!publicState || !privateState || !selfPlayerId) {
    return <div className="page centered">載入房間狀態中...</div>;
  }

  return (
    <div className="page room-page">
      {lastActionError && <div className="toast">{lastActionError}</div>}
      <PhaseView publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
    </div>
  );
}
