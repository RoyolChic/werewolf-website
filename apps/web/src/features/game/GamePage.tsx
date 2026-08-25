import type { PrivatePlayerState, PublicRoomState } from "@kill-wolf/shared";
import { GameLogPanel } from "../../components/GameLogPanel";
import { PublicGamePanel } from "./PublicGamePanel";
import { RoleActionPanel } from "./RoleActionPanel";
import { useGamePhaseAudio } from "./useGamePhaseAudio";

interface GamePageProps {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}

export function GamePage({ publicState, privateState, selfPlayerId }: GamePageProps) {
  useGamePhaseAudio(publicState, privateState, selfPlayerId);
  const self = publicState.players.find((p) => p.playerId === selfPlayerId);
  const isDeadAndHidden = self && !self.isAlive && privateState.deadViewMode === "HIDDEN";

  if (isDeadAndHidden) {
    return (
      <div className="page centered">
        <p>你已死亡</p>
        <RoleActionPanel publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
        <GameLogPanel publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
      </div>
    );
  }

  return (
    <div className="game-page">
      <PublicGamePanel publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
      <RoleActionPanel publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
      <GameLogPanel publicState={publicState} privateState={privateState} selfPlayerId={selfPlayerId} />
    </div>
  );
}
