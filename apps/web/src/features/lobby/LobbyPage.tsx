import { useState } from "react";
import {
  CLIENT_EVENTS,
  DAY_DISCUSSION_SECONDS_MAX,
  DAY_DISCUSSION_SECONDS_MIN,
  ROLE_COUNTS_BY_PLAYER_COUNT,
  ROLE_LABELS,
  type PublicRoomState,
  type WitchSelfSaveRule,
} from "@kill-wolf/shared";
import { getSocket } from "../../lib/socketClient";
import { PlayerList } from "../../components/PlayerList";
import { Button } from "../../components/Button";
import { ShareRoomPanel } from "./ShareRoomPanel";

interface LobbyPageProps {
  publicState: PublicRoomState;
  selfPlayerId: string;
  isHost: boolean;
}

export function LobbyPage({ publicState, selfPlayerId, isHost }: LobbyPageProps) {
  const [maxPlayers, setMaxPlayers] = useState(publicState.maxPlayers);
  const roomId = publicState.roomId;
  const socket = getSocket();

  const roomFull = publicState.players.length === publicState.maxPlayers;

  return (
    <div className="lobby-page">
      <ShareRoomPanel roomId={roomId} />

      <section className="card">
        <h2>
          玩家列表（{publicState.players.length} / {publicState.maxPlayers}）
        </h2>
        <PlayerList
          players={publicState.players}
          selfPlayerId={selfPlayerId}
          showKick={isHost}
          onKick={(targetPlayerId) => socket.emit(CLIENT_EVENTS.KICK_PLAYER, { roomId, targetPlayerId })}
        />
      </section>

      <section className="card">
        <h2>房間設定</h2>
        <div className="role-config-summary">
          {(Object.entries(publicState.roleCounts) as [keyof typeof publicState.roleCounts, number][])
            .filter(([, count]) => count > 0)
            .map(([role, count]) => (
              <span key={role} className="role-config-item">
                {ROLE_LABELS[role]} x{count}
              </span>
            ))}
        </div>
        <p>白天發言秒數：{publicState.dayDiscussionSeconds} 秒</p>
        <p>女巫自救規則：{publicState.witchSelfSaveRule === "ANYTIME" ? "隨時可以自救" : "只能第一晚自救"}</p>

        {isHost && (
          <div className="host-controls">
            <label className="field">
              <span>重新設定人數</span>
              <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {Object.keys(ROLE_COUNTS_BY_PLAYER_COUNT).map((count) => (
                  <option key={count} value={count}>
                    {count} 人
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              onClick={() => socket.emit(CLIENT_EVENTS.SET_MAX_PLAYERS, { roomId, maxPlayers })}
              disabled={maxPlayers === publicState.maxPlayers}
            >
              套用人數變更
            </Button>

            <label className="field">
              <span>白天發言秒數</span>
              <input
                type="range"
                min={DAY_DISCUSSION_SECONDS_MIN}
                max={DAY_DISCUSSION_SECONDS_MAX}
                step={10}
                defaultValue={publicState.dayDiscussionSeconds}
                onMouseUp={(e) =>
                  socket.emit(CLIENT_EVENTS.SET_DAY_DISCUSSION_SECONDS, {
                    roomId,
                    seconds: Number((e.target as HTMLInputElement).value),
                  })
                }
              />
            </label>

            <label className="field">
              <span>女巫自救規則</span>
              <select
                value={publicState.witchSelfSaveRule}
                onChange={(e) =>
                  socket.emit(CLIENT_EVENTS.SET_WITCH_SELF_SAVE_RULE, {
                    roomId,
                    rule: e.target.value as WitchSelfSaveRule,
                  })
                }
              >
                <option value="FIRST_NIGHT_ONLY">只能第一晚自救</option>
                <option value="ANYTIME">隨時可以自救</option>
              </select>
            </label>

            <Button
              onClick={() => socket.emit(CLIENT_EVENTS.START_CARD_PICKING, { roomId })}
              disabled={!roomFull}
            >
              {roomFull ? "開始選牌" : "等待人數到齊"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
