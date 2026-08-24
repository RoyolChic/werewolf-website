import { useCallback, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ErrorPayload,
  type PrivatePlayerState,
  type PrivateStateUpdatedPayload,
  type PublicRoomState,
  type RoomCreatedPayload,
  type RoomJoinedPayload,
  type RoomStateUpdatedPayload,
} from "@kill-wolf/shared";
import { createIsolatedSocket } from "../../lib/socketClient";
import { SocketProvider } from "../../lib/socketContext";
import { Button } from "../../components/Button";
import { DEFAULT_ROOM_CONFIG_VALUE, RoomConfigPanel } from "../home/RoomConfigPanel";
import { PhaseView } from "../../app/PhaseView";

interface DevPlayer {
  key: string;
  label: string;
  socket: Socket;
  playerId: string | null;
  publicState: PublicRoomState | null;
  privateState: PrivatePlayerState | null;
  lastError: string | null;
}

let nextKey = 1;

export function DevMultiViewPage() {
  const [config, setConfig] = useState(DEFAULT_ROOM_CONFIG_VALUE);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<DevPlayer[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roomIdRef = useRef<string | null>(null);
  const botCounterRef = useRef(0);

  const attachPlayer = useCallback((key: string, socket: Socket, label: string) => {
    setPlayers((prev) => [...prev, { key, label, socket, playerId: null, publicState: null, privateState: null, lastError: null }]);

    socket.on(SERVER_EVENTS.ROOM_STATE_UPDATED, (payload: RoomStateUpdatedPayload) => {
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, publicState: payload } : p)));
    });
    socket.on(SERVER_EVENTS.PRIVATE_STATE_UPDATED, (payload: PrivateStateUpdatedPayload) => {
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, privateState: payload } : p)));
    });
    socket.on(SERVER_EVENTS.ERROR, (payload: ErrorPayload) => {
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, lastError: payload.message } : p)));
    });
  }, []);

  const createRoom = useCallback(() => {
    setBusy(true);
    const socket = createIsolatedSocket();
    const key = `dev-${nextKey++}`;

    function onCreated(payload: RoomCreatedPayload) {
      roomIdRef.current = payload.roomId;
      setRoomId(payload.roomId);
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, playerId: payload.playerId } : p)));
      setActiveKey(key);
      setBusy(false);
      socket.off(SERVER_EVENTS.ROOM_CREATED, onCreated);
    }

    attachPlayer(key, socket, "房主 (Host)");
    socket.on(SERVER_EVENTS.ROOM_CREATED, onCreated);
    socket.emit(CLIENT_EVENTS.CREATE_ROOM, { ...config, hostName: "Host" });
  }, [attachPlayer, config]);

  const addBot = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;
    const socket = createIsolatedSocket();
    const key = `dev-${nextKey++}`;
    botCounterRef.current += 1;
    const label = `Bot${botCounterRef.current}`;

    function onJoined(payload: RoomJoinedPayload) {
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, playerId: payload.playerId } : p)));
      socket.off(SERVER_EVENTS.ROOM_JOINED, onJoined);
    }

    attachPlayer(key, socket, label);
    socket.on(SERVER_EVENTS.ROOM_JOINED, onJoined);
    socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId: currentRoomId, name: label });
  }, [attachPlayer]);

  const fillRemainingSlots = useCallback(() => {
    const target = config.maxPlayers;
    const missing = Math.max(0, target - players.length);
    for (let i = 0; i < missing; i += 1) {
      // Stagger slightly so each bot's JOIN_ROOM lands as its own tick; not strictly required
      // (the server resolves identity by socket.id) but keeps the player list ordering stable.
      setTimeout(() => addBot(), i * 50);
    }
  }, [addBot, config.maxPlayers, players.length]);

  const resetAll = useCallback(() => {
    for (const player of players) {
      player.socket.disconnect();
    }
    setPlayers([]);
    setRoomId(null);
    roomIdRef.current = null;
    setActiveKey(null);
    botCounterRef.current = 0;
  }, [players]);

  const activePlayer = players.find((p) => p.key === activeKey) ?? null;

  return (
    <div className="page dev-multiview-page">
      <h1>開發測試工具（DevMultiViewPage）</h1>
      <p className="error-text">此頁面僅供開發環境使用，正式站不會包含此頁面。</p>

      {!roomId && (
        <section className="card">
          <h2>建立測試房</h2>
          <RoomConfigPanel value={config} onChange={setConfig} />
          <Button onClick={createRoom} disabled={busy}>
            建立測試房並加入房主
          </Button>
        </section>
      )}

      {roomId && (
        <section className="card">
          <h2>房間 {roomId}</h2>
          <p>
            目前 {players.length} / {config.maxPlayers} 人
          </p>
          <div className="dev-toolbar">
            <Button variant="secondary" onClick={addBot} disabled={players.length >= config.maxPlayers}>
              加入一個假玩家
            </Button>
            <Button
              variant="secondary"
              onClick={fillRemainingSlots}
              disabled={players.length >= config.maxPlayers}
            >
              一鍵補滿假玩家
            </Button>
            <Button variant="danger" onClick={resetAll}>
              重置（斷開所有連線）
            </Button>
          </div>
        </section>
      )}

      {players.length > 0 && (
        <section className="card">
          <div className="dev-player-tabs">
            {players.map((p) => (
              <button
                key={p.key}
                className={`dev-player-tab ${p.key === activeKey ? "dev-player-tab-active" : ""}`}
                onClick={() => setActiveKey(p.key)}
              >
                {p.label}
                {p.privateState?.role ? ` · ${p.privateState.role}` : ""}
                {p.publicState?.players.find((pp) => pp.playerId === p.playerId)?.isAlive === false ? " · 死亡" : ""}
                {p.lastError ? " ⚠" : ""}
              </button>
            ))}
          </div>

          {activePlayer && (
            <div className="dev-player-detail">
              <p className="dev-player-meta">
                phase: <strong>{activePlayer.publicState?.phase ?? "-"}</strong>
                {"  "}day: {activePlayer.publicState?.dayNumber ?? 0} / night: {activePlayer.publicState?.nightNumber ?? 0}
              </p>
              {activePlayer.lastError && <p className="error-text">上次錯誤：{activePlayer.lastError}</p>}

              {activePlayer.publicState && activePlayer.privateState && activePlayer.playerId ? (
                <SocketProvider socket={activePlayer.socket}>
                  <PhaseView
                    publicState={activePlayer.publicState}
                    privateState={activePlayer.privateState}
                    selfPlayerId={activePlayer.playerId}
                  />
                </SocketProvider>
              ) : (
                <p>等待這位玩家的狀態同步...</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default DevMultiViewPage;
