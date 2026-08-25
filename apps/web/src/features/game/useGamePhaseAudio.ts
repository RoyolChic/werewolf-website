import { useEffect, useRef } from "react";
import type { PrivatePlayerState, PublicRoomState } from "@kill-wolf/shared";
import { useAudio } from "../../lib/audio/audioContext";

/**
 * Fires the appropriate narration/sfx cue whenever the room's phase actually changes, and keeps
 * the background ambience loop in sync with night/day. Deliberately coarse: one representative
 * cue per transition rather than the full sequenced timeline the audio spec describes, since most
 * of that timeline's clips (role "close eyes" lines, per-role SFX stings) don't have matching
 * files yet -- see apps/web/src/lib/audio/assets.ts for what's actually wired up.
 */
export function useGamePhaseAudio(
  publicState: PublicRoomState,
  privateState: PrivatePlayerState,
  selfPlayerId: string,
): void {
  const { playCue, setLoopScene } = useAudio();
  const lastPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPhaseRef.current === publicState.phase) return;
    lastPhaseRef.current = publicState.phase;

    const isAlive = publicState.players.find((p) => p.playerId === selfPlayerId)?.isAlive ?? false;
    const role = privateState.role;

    switch (publicState.phase) {
      case "NIGHT_START":
        setLoopScene("night");
        playCue("voice.night.atmosphere");
        break;
      case "NIGHT_WEREWOLF":
        if (role === "WEREWOLF" && isAlive) {
          playCue("voice.wolf.open");
        } else {
          playCue("voice.night.close_eyes");
        }
        break;
      case "NIGHT_SEER":
        if (role === "SEER" && isAlive) playCue("voice.seer.open");
        break;
      case "NIGHT_WITCH":
        if (role === "WITCH" && isAlive) playCue("voice.witch.open");
        break;
      case "HUNTER_SHOOT":
        if (privateState.availableActions.includes("HUNTER_SHOOT")) playCue("sfx.hunter.trigger");
        break;
      case "DAY_ANNOUNCEMENT":
        setLoopScene("day");
        playCue(publicState.lastNightDeathPlayerIds?.length === 0 ? "voice.result.no_death" : "voice.day.atmosphere");
        break;
      case "DAY_DISCUSSION":
        playCue("voice.discussion.start");
        break;
      case "DAY_VOTE":
        playCue("voice.vote.start");
        break;
      case "DAY_EXILE_RESULT":
        playCue(publicState.exileResult?.exiledPlayerId ? "sfx.vote.exile" : "sfx.vote.tie");
        break;
      case "DAY_LAST_WORDS":
        playCue("voice.last_words.start");
        break;
      case "GAME_OVER":
        playCue(publicState.winner === "WEREWOLF" ? "voice.result.wolf_win" : "voice.result.village_win");
        break;
      default:
        break;
    }
    // Deliberately keyed on phase alone -- role/alive/etc. are read fresh from the closure each
    // time the phase changes, not tracked as their own dependencies.
  }, [publicState.phase]);
}
