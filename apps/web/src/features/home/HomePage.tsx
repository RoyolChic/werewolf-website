import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENT_EVENTS, SERVER_EVENTS, type ErrorPayload, type RoomCreatedPayload } from "@kill-wolf/shared";
import { getSocket } from "../../lib/socketClient";
import { setStoredSession } from "../../lib/session";
import { Button } from "../../components/Button";
import { DEFAULT_ROOM_CONFIG_VALUE, RoomConfigPanel } from "./RoomConfigPanel";

export function HomePage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(DEFAULT_ROOM_CONFIG_VALUE);
  const [hostName, setHostName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function createRoom() {
    if (!hostName.trim()) {
      setError("請輸入名稱");
      return;
    }
    setCreating(true);
    setError(null);
    const socket = getSocket();

    function handleCreated(payload: RoomCreatedPayload) {
      setStoredSession(payload.roomId, {
        playerId: payload.playerId,
        reconnectToken: payload.reconnectToken,
        name: hostName.trim(),
      });
      cleanup();
      navigate(`/room/${payload.roomId}`);
    }

    function handleError(payload: ErrorPayload) {
      cleanup();
      setError(payload.message);
    }

    function cleanup() {
      setCreating(false);
      socket.off(SERVER_EVENTS.ROOM_CREATED, handleCreated);
      socket.off(SERVER_EVENTS.ERROR, handleError);
    }

    socket.on(SERVER_EVENTS.ROOM_CREATED, handleCreated);
    socket.on(SERVER_EVENTS.ERROR, handleError);
    socket.emit(CLIENT_EVENTS.CREATE_ROOM, { ...config, hostName: hostName.trim() });
  }

  function joinRoom() {
    const code = joinRoomId.trim().toUpperCase();
    if (code.length === 7) {
      navigate(`/room/${code}`);
    } else {
      setError("房間號碼需為 7 碼");
    }
  }

  return (
    <div className="page home-page">
      <h1>狼人殺無主持人發牌</h1>

      <section className="card">
        <h2>建立房間</h2>
        <label className="field">
          <span>你的名稱</span>
          <input value={hostName} onChange={(e) => setHostName(e.target.value)} maxLength={16} placeholder="輸入名稱" />
        </label>
        <RoomConfigPanel value={config} onChange={setConfig} />
        <Button onClick={createRoom} disabled={creating}>
          {creating ? "建立中..." : "建立房間"}
        </Button>
      </section>

      <section className="card">
        <h2>加入房間</h2>
        <label className="field">
          <span>房間號碼</span>
          <input
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            maxLength={7}
            placeholder="7 碼房間號碼"
          />
        </label>
        <Button variant="secondary" onClick={joinRoom}>
          加入房間
        </Button>
      </section>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
