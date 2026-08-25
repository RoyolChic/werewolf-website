import { type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { PhaseBanner } from "../../components/PhaseBanner";
import { Countdown } from "../../components/Countdown";
import { getNarratorLine } from "./narratorLines";

export function PublicGamePanel({
  publicState,
  privateState,
  selfPlayerId,
}: {
  publicState: PublicRoomState;
  privateState: PrivatePlayerState;
  selfPlayerId: string;
}) {
  const narratorLine = getNarratorLine(publicState, privateState, selfPlayerId);
  const showNarratorLine =
    publicState.phase === "DAY_ANNOUNCEMENT" ||
    publicState.phase === "DAY_DISCUSSION" ||
    publicState.phase === "DAY_TIEBREAK_DISCUSSION" ||
    publicState.phase === "DAY_EXILE_RESULT" ||
    publicState.phase === "DAY_LAST_WORDS";

  return (
    <section className="card">
      <PhaseBanner phase={publicState.phase} dayNumber={publicState.dayNumber} nightNumber={publicState.nightNumber} />
      {publicState.isPaused && <p className="paused-banner">有玩家離線，遊戲暫停中...</p>}
      {(publicState.phase === "DAY_DISCUSSION" || publicState.phase === "DAY_TIEBREAK_DISCUSSION") && (
        <Countdown endsAt={publicState.discussionEndsAt} fallbackSeconds={publicState.discussionSecondsRemaining} />
      )}
      {publicState.phase === "DAY_LAST_WORDS" && (
        <Countdown endsAt={publicState.lastWordsEndsAt} fallbackSeconds={publicState.lastWordsSecondsRemaining} />
      )}
      {showNarratorLine && narratorLine && <p className="narrator-line">{narratorLine}</p>}
    </section>
  );
}
