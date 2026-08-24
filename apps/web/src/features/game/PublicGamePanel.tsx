import { type PublicRoomState } from "@kill-wolf/shared";
import { PhaseBanner } from "../../components/PhaseBanner";
import { PlayerList } from "../../components/PlayerList";
import { Countdown } from "../../components/Countdown";

export function PublicGamePanel({ publicState, selfPlayerId }: { publicState: PublicRoomState; selfPlayerId: string }) {
  return (
    <section className="card">
      <PhaseBanner phase={publicState.phase} dayNumber={publicState.dayNumber} nightNumber={publicState.nightNumber} />
      {publicState.isPaused && <p className="paused-banner">有玩家離線，遊戲暫停中...</p>}
      {publicState.phase === "DAY_DISCUSSION" && (
        <Countdown secondsRemaining={publicState.discussionSecondsRemaining} />
      )}
      {publicState.phase === "DAY_ANNOUNCEMENT" && (
        <p>
          {publicState.lastNightDeathPlayerIds && publicState.lastNightDeathPlayerIds.length > 0
            ? `昨晚死亡：${publicState.lastNightDeathPlayerIds
                .map((id) => publicState.players.find((p) => p.playerId === id)?.name ?? id)
                .join("、")}`
            : "昨晚是平安夜"}
        </p>
      )}
      {publicState.phase === "DAY_EXILE_RESULT" && (
        <p>
          {publicState.exileResult?.exiledPlayerId
            ? `放逐結果：${
                publicState.players.find((p) => p.playerId === publicState.exileResult?.exiledPlayerId)?.name ?? ""
              }`
            : "本輪無人被放逐"}
        </p>
      )}
      <PlayerList players={publicState.players} selfPlayerId={selfPlayerId} />
    </section>
  );
}
