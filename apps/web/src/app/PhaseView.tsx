import type { PrivatePlayerState, PublicRoomState } from "@kill-wolf/shared";
import { LobbyPage } from "../features/lobby/LobbyPage";
import { CardPickingPage } from "../features/cardPicking/CardPickingPage";
import { GamePage } from "../features/game/GamePage";
import { GameOverPage } from "../features/result/GameOverPage";

interface PhaseViewProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

/**
 * Picks the right feature page for the room's current phase. Shared by the real RoomPage and the
 * dev multi-view tool so both stay in lockstep with exactly the same UI per phase.
 */
export function PhaseView({ publicState, privateState, selfPlayerId }: PhaseViewProps) {
  const isHost = publicState.hostPlayerId === selfPlayerId;

  if (publicState.phase === "LOBBY") {
    return <LobbyPage publicState={publicState} selfPlayerId={selfPlayerId} isHost={isHost} />;
  }

  if (publicState.phase === "CARD_PICKING" || publicState.phase === "ROLE_REVEAL") {
    return <CardPickingPage publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />;
  }

  if (publicState.phase === "GAME_OVER") {
    return <GameOverPage publicState={publicState} />;
  }

  return <GamePage publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />;
}
