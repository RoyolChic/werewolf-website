import { FACTION_LABELS, ROLE_LABELS, type PublicRoomState } from "@kill-wolf/shared";
import { Button } from "../../components/Button";

export function GameOverPage({ publicState }: { publicState: PublicRoomState }) {
  return (
    <div className="page centered game-over-page">
      <h1>{publicState.winner ? `${FACTION_LABELS[publicState.winner]}勝利` : "遊戲結束"}</h1>

      <table className="reveal-table">
        <thead>
          <tr>
            <th>玩家</th>
            <th>角色</th>
            <th>結果</th>
          </tr>
        </thead>
        <tbody>
          {publicState.players.map((player) => (
            <tr key={player.playerId}>
              <td>{player.name}</td>
              <td>{publicState.revealedRoles?.[player.playerId] ? ROLE_LABELS[publicState.revealedRoles[player.playerId]] : "-"}</td>
              <td>{player.isAlive ? "存活" : "死亡"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button onClick={() => (window.location.href = "/")}>回首頁</Button>
    </div>
  );
}
