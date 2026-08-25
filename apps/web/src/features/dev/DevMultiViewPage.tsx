import { useCallback, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ErrorPayload,
  type PlayerKickedPayload,
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
import { SceneBackdrop } from "../../components/SceneBackdrop";
import { DEFAULT_BACKGROUND_PATH, PHASE_BACKGROUND_PATH } from "../../lib/phaseBackground";
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
    // The server only tells the kicked player's own socket -- without this, a kicked dev player
    // stays in `players` forever, so the room never looks like it has a free slot again.
    socket.on(SERVER_EVENTS.PLAYER_KICKED, (_payload: PlayerKickedPayload) => {
      socket.disconnect();
      setPlayers((prev) => prev.filter((p) => p.key !== key));
      setActiveKey((prev) => (prev === key ? null : prev));
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
  const backgroundPath = activePlayer?.publicState
    ? PHASE_BACKGROUND_PATH[activePlayer.publicState.phase]
    : DEFAULT_BACKGROUND_PATH;

  if (!roomId) {
    return (
      <>
        <SceneBackdrop imagePath={backgroundPath} />
        <div className="page centered">
          <section className="card">
            <h1>開發測試工具</h1>
            <p className="error-text">此頁面僅供開發環境使用，正式站不會包含此頁面。</p>
            <RoomConfigPanel value={config} onChange={setConfig} />
            <Button onClick={createRoom} disabled={busy}>
              建立測試房並加入房主
            </Button>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SceneBackdrop imagePath={backgroundPath} />
      {/*
        Everything below the toolbar bar is intentionally the *exact* structure RoomPage.tsx uses
        (SceneBackdrop -> ".page room-page" -> PhaseView) so the simulated view stays visually in
        sync with the real page. The toolbar is the only thing this tool adds on top of that.
      */}
      <div className="dev-toolbar-bar">
        <span className="dev-toolbar-info">
          開發用 · {roomId} · {players.length}/{config.maxPlayers}
          {activePlayer?.publicState && ` · ${activePlayer.publicState.phase}`}
        </span>
        <Button variant="secondary" className="btn-small" onClick={addBot} disabled={players.length >= config.maxPlayers}>
          +假玩家
        </Button>
        <Button
          variant="secondary"
          className="btn-small"
          onClick={fillRemainingSlots}
          disabled={players.length >= config.maxPlayers}
        >
          補滿
        </Button>
        <Button variant="danger" className="btn-small" onClick={resetAll}>
          重置
        </Button>
        <div className="dev-toolbar-tabs">
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
      </div>
      <div className="page room-page">
        {activePlayer?.lastError && <div className="toast">{activePlayer.lastError}</div>}
        {activePlayer?.publicState && activePlayer.privateState && activePlayer.playerId ? (
          <SocketProvider socket={activePlayer.socket}>
            <PhaseView
              publicState={activePlayer.publicState}
              privateState={activePlayer.privateState}
              selfPlayerId={activePlayer.playerId}
            />
          </SocketProvider>
        ) : (
          <p>{activePlayer ? "等待這位玩家的狀態同步..." : "請選擇一個玩家頁籤"}</p>
        )}
      </div>
    </>
  );
}

export default DevMultiViewPage;
