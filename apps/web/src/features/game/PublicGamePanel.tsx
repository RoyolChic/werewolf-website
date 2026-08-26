import type { CSSProperties } from "react";
import { type PrivatePlayerState, type PublicRoomState } from "@kill-wolf/shared";
import { PhaseBanner } from "../../components/PhaseBanner";
import { Countdown } from "../../components/Countdown";
import { getPlayerColor } from "../../lib/playerColors";
import { getNarratorLine, playerName } from "./narratorLines";

// Phases where "who died last night" is still relevant context for the table.
const DEATH_RECAP_PHASES = new Set([
  "DAY_ANNOUNCEMENT",
  "DAY_DISCUSSION",
  "DAY_TIEBREAK_DISCUSSION",
  "DAY_VOTE",
  "DAY_EXILE_RESULT",
  "DAY_LAST_WORDS",
]);

// Phases where someone actually holds the floor right now (as opposed to voting/results).
const SPEAKING_PHASES = new Set(["DAY_DISCUSSION", "DAY_TIEBREAK_DISCUSSION", "DAY_LAST_WORDS"]);

function seatNumberOf(publicState: PublicRoomState, playerId: string | null | undefined): number | null {
  if (!playerId) return null;
  const index = publicState.players.findIndex((p) => p.playerId === playerId);
  return index === -1 ? null : index + 1;
}

/**
 * Standing banner pinned to the top of the game screen: who died last night, and (while the
 * discussion/last-words phases are running) whose turn it currently is to speak. Unlike the
 * one-off narrator line below, this stays up to date as the speaking turn moves from player to
 * player, not just at the moment the phase starts.
 */
function SpeakerBanner({ publicState, selfPlayerId }: { publicState: PublicRoomState; selfPlayerId: string }) {
  if (!DEATH_RECAP_PHASES.has(publicState.phase)) return null;

  const deaths = publicState.lastNightDeathPlayerIds;
  const deathLine =
    deaths && deaths.length > 0
      ? `昨晚死亡的是：${deaths.map((id) => playerName(publicState, id) ?? id).join("、")}`
      : "昨晚是平安夜";

  const speakerId = publicState.phase === "DAY_LAST_WORDS" ? publicState.lastWordsPlayerId : publicState.currentSpeakerPlayerId;
  const speakerName = playerName(publicState, speakerId);
  const seatNumber = seatNumberOf(publicState, speakerId);
  const isSelfSpeaking = SPEAKING_PHASES.has(publicState.phase) && speakerId != null && speakerId === selfPlayerId;
  const speakerLine =
    SPEAKING_PHASES.has(publicState.phase) && speakerName && seatNumber != null
      ? `現在是 ${seatNumber}號 ${speakerName} 發言`
      : null;
  const speakerColor = seatNumber != null ? getPlayerColor(seatNumber - 1) : null;
  const speakerColorStyle = speakerColor
    ? ({ "--speaker-color": speakerColor.solid, "--speaker-glow": speakerColor.glowLow } as CSSProperties)
    : undefined;

  return (
    <div className="speaker-banner" style={speakerColorStyle}>
      <p className="speaker-banner-death">{deathLine}</p>
      {speakerLine && (
        <p className={isSelfSpeaking ? "speaker-banner-speaker speaker-banner-speaker-self" : "speaker-banner-speaker"}>
          {speakerLine}
          {isSelfSpeaking && "，輪到你了！"}
        </p>
      )}
    </div>
  );
}

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
  // DAY_ANNOUNCEMENT/DAY_DISCUSSION are deliberately excluded here -- the SpeakerBanner above
  // already covers who died and who's speaking for those, and used to duplicate this line verbatim.
  const showNarratorLine =
    publicState.phase === "DAY_TIEBREAK_DISCUSSION" ||
    publicState.phase === "DAY_EXILE_RESULT" ||
    publicState.phase === "DAY_LAST_WORDS";

  return (
    <section className="card">
      <PhaseBanner phase={publicState.phase} dayNumber={publicState.dayNumber} nightNumber={publicState.nightNumber} />
      <SpeakerBanner publicState={publicState} selfPlayerId={selfPlayerId} />
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
