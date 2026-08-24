import type { PlayerPublicState } from "@kill-wolf/shared";

interface PlayerListProps {
  players: PlayerPublicState[];
  selfPlayerId: string | null;
  onKick?: (playerId: string) => void;
  showKick?: boolean;
}

export function PlayerList({ players, selfPlayerId, onKick, showKick }: PlayerListProps) {
  return (
    <ul className="player-list">
      {players.map((player) => (
        <li key={player.playerId} className={`player-row ${!player.isAlive ? "player-row-dead" : ""}`}>
          <span className="player-name">
            {player.name}
            {player.playerId === selfPlayerId ? "（你）" : ""}
          </span>
          {player.isHost && <span className="badge badge-host">房主</span>}
          <span className={`badge ${player.isConnected ? "badge-online" : "badge-offline"}`}>
            {player.isConnected ? "在線" : "離線"}
          </span>
          {!player.isAlive && <span className="badge badge-dead">已死亡</span>}
          {player.hasPickedCard && <span className="badge badge-picked">已選牌</span>}
          {showKick && onKick && player.playerId !== selfPlayerId && (
            <button className="btn btn-danger btn-small" onClick={() => onKick(player.playerId)}>
              踢除
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
