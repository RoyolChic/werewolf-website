import { CLIENT_EVENTS, type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { getSocket } from "../../lib/socketClient";
import { Button } from "../../components/Button";
import { RoleBadge } from "../../components/RoleBadge";
import { CardGrid } from "./CardGrid";

interface CardPickingPageProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

export function CardPickingPage({ publicState, privateState, selfPlayerId }: CardPickingPageProps) {
  const roomId = publicState.roomId;
  const socket = getSocket();
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);
  const hasConfirmed = self?.hasPickedCard ?? false;

  if (publicState.phase === "ROLE_REVEAL") {
    const confirmed = !privateState.availableActions.includes("CONFIRM_ROLE");
    return (
      <div className="page centered role-reveal-page">
        <h1>你的角色是</h1>
        {privateState.role && <RoleBadge role={privateState.role} />}
        <p>
          {publicState.players.filter((p) => p.hasPickedCard).length} / {publicState.players.length} 人已確認角色
        </p>
        <Button onClick={() => socket.emit(CLIENT_EVENTS.CONFIRM_ROLE, { roomId })} disabled={confirmed}>
          {confirmed ? "等待其他玩家..." : "確認角色，開始遊戲"}
        </Button>
      </div>
    );
  }

  return (
    <div className="card-picking-page">
      <h1>選擇一張牌</h1>
      <p>
        {publicState.players.filter((p) => p.hasPickedCard).length} / {publicState.players.length} 人已確認卡牌
      </p>
      <CardGrid
        cards={publicState.cards}
        selfPlayerId={selfPlayerId}
        hasConfirmed={hasConfirmed}
        onPick={(cardIndex) => socket.emit(CLIENT_EVENTS.PICK_CARD, { roomId, cardIndex })}
        onConfirm={(cardIndex) => socket.emit(CLIENT_EVENTS.CONFIRM_CARD, { roomId, cardIndex })}
        onCancel={() => socket.emit(CLIENT_EVENTS.CANCEL_CARD, { roomId })}
      />
      {hasConfirmed && <p>已確認卡牌，等待其他玩家...</p>}
    </div>
  );
}
