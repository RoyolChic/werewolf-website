import { useState, type ReactNode } from "react";
import { FACTION_LABELS, type PrivatePlayerState, type PublicRoomState, type VoteHistoryEntry } from "@kill-wolf/shared";
import { Button } from "./Button";
import { Modal } from "./Modal";

type Tab = "LOG" | "PRIVATE" | "NOTES";

interface TimelineEntry {
  key: string;
  order: number;
  content: ReactNode;
}

function playerName(publicState: PublicRoomState, playerId: string | null): string {
  if (!playerId) return "棄票";
  return publicState.players.find((p) => p.playerId === playerId)?.name ?? playerId;
}

function seatNumberOf(publicState: PublicRoomState, playerId: string): number | null {
  const index = publicState.players.findIndex((p) => p.playerId === playerId);
  return index === -1 ? null : index + 1;
}

function VoteTable({ publicState, vote }: { publicState: PublicRoomState; vote: VoteHistoryEntry }) {
  const votersByTarget = new Map<string, number[]>();
  const abstainSeats: number[] = [];

  for (const [voterId, targetId] of Object.entries(vote.votes)) {
    const voterSeat = seatNumberOf(publicState, voterId);
    if (voterSeat === null) continue;
    if (!targetId) {
      abstainSeats.push(voterSeat);
      continue;
    }
    const seats = votersByTarget.get(targetId) ?? [];
    seats.push(voterSeat);
    votersByTarget.set(targetId, seats);
  }

  let resultText: string;
  if (vote.exiledPlayerId) {
    resultText = `${playerName(publicState, vote.exiledPlayerId)} 被放逐`;
  } else if (votersByTarget.size === 0) {
    resultText = "全員棄票，無人出局";
  } else {
    const maxCount = Math.max(...[...votersByTarget.values()].map((seats) => seats.length));
    const tiedSeats = [...votersByTarget.entries()]
      .filter(([, seats]) => seats.length === maxCount)
      .map(([targetId]) => seatNumberOf(publicState, targetId))
      .filter((seat): seat is number => seat !== null)
      .sort((a, b) => a - b);
    resultText =
      vote.round === 1
        ? `${tiedSeats.join("、")} 號平票，進入第二輪投票`
        : `${tiedSeats.join("、")} 號再次平票，無人出局`;
  }

  return (
    <div>
      <p className="vote-table-title">
        第 {vote.day} 天投票（第 {vote.round} 輪）
      </p>
      <table className="vote-table">
        <thead>
          <tr>
            <th>號碼</th>
            <th>投票的人</th>
            <th>票數</th>
          </tr>
        </thead>
        <tbody>
          {publicState.players.map((player, index) => {
            const seats = (votersByTarget.get(player.playerId) ?? []).sort((a, b) => a - b);
            return (
              <tr key={player.playerId}>
                <td>{index + 1}</td>
                <td>{seats.join("、")}</td>
                <td>{seats.length}</td>
              </tr>
            );
          })}
          {abstainSeats.length > 0 && (
            <tr>
              <td>棄票</td>
              <td>{abstainSeats.sort((a, b) => a - b).join("、")}</td>
              <td>{abstainSeats.length}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="vote-table-result">結果：{resultText}</p>
    </div>
  );
}

function buildTimeline(publicState: PublicRoomState): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const night of publicState.nightHistory) {
    const text =
      night.deathPlayerIds.length === 0
        ? `第 ${night.night} 夜：平安夜`
        : `第 ${night.night} 夜：${night.deathPlayerIds.map((id) => playerName(publicState, id)).join("、")} 死亡${
            night.doubleProtected ? "（同守同救，解藥失效）" : ""
          }`;
    entries.push({ key: `night-${night.night}`, order: night.night * 2, content: text });
  }

  for (const vote of publicState.voteHistory) {
    entries.push({
      key: `vote-${vote.day}-${vote.round}`,
      order: vote.day * 2 + 1,
      content: <VoteTable publicState={publicState} vote={vote} />,
    });
  }

  return entries.sort((a, b) => a.order - b.order);
}

export function GameLogPanel({
  publicState,
  privateState,
  selfPlayerId,
}: {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("LOG");
  const notesKey = `notes:${publicState.roomId}:${selfPlayerId}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) ?? "");
  const timeline = buildTimeline(publicState);
  // The seer's own check results keep growing all game -- rather than let them pile up straight
  // on the game screen, they live here so the main screen stays a fixed height.
  const hasPrivateLog = privateState.role === "SEER";

  return (
    <>
      <Button variant="secondary" className="game-log-button" onClick={() => setOpen(true)}>
        📜 紀錄
      </Button>
      {open && (
        <Modal>
          <div className="game-log-tabs">
            <Button
              variant={tab === "LOG" ? "primary" : "secondary"}
              className="btn-small"
              onClick={() => setTab("LOG")}
            >
              公開紀錄
            </Button>
            {hasPrivateLog && (
              <Button
                variant={tab === "PRIVATE" ? "primary" : "secondary"}
                className="btn-small"
                onClick={() => setTab("PRIVATE")}
              >
                我的紀錄
              </Button>
            )}
            <Button
              variant={tab === "NOTES" ? "primary" : "secondary"}
              className="btn-small"
              onClick={() => setTab("NOTES")}
            >
              我的筆記
            </Button>
          </div>
          {tab === "LOG" && (
            <div className="game-log-body">
              {timeline.length === 0 ? (
                <p className="muted-text">目前還沒有紀錄</p>
              ) : (
                timeline.map((entry) => (
                  <div key={entry.key} className="game-log-entry">
                    {entry.content}
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "PRIVATE" && (
            <div className="game-log-body">
              {!privateState.seerChecks || privateState.seerChecks.length === 0 ? (
                <p className="muted-text">尚無查驗紀錄</p>
              ) : (
                privateState.seerChecks.map((check) => (
                  <p key={check.night} className="game-log-entry">
                    第 {check.night} 夜：{playerName(publicState, check.targetPlayerId)} 是 {FACTION_LABELS[check.faction]}
                  </p>
                ))
              )}
            </div>
          )}
          {tab === "NOTES" && (
            <textarea
              className="game-log-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                localStorage.setItem(notesKey, e.target.value);
              }}
              placeholder="寫下你的推理筆記..."
            />
          )}
          <Button variant="secondary" onClick={() => setOpen(false)}>
            關閉
          </Button>
        </Modal>
      )}
    </>
  );
}
