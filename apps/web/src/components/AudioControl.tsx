import { useState } from "react";
import { useAudio } from "../lib/audio/audioContext";

/**
 * Global volume/mute control, fixed to the top-right corner of every page. Clicking the icon
 * toggles a small popover with a mute switch and separate volume sliders for narration and
 * background music; the icon itself always shows the current mute state at a glance.
 */
export function AudioControl() {
  const { muted, voiceVolume, musicVolume, setMuted, setVoiceVolume, setMusicVolume } = useAudio();
  const [open, setOpen] = useState(false);

  return (
    <div className="audio-control">
      <button
        className="audio-control-icon"
        onClick={() => setOpen((o) => !o)}
        aria-label={muted ? "音效已關閉" : "音效設定"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      {open && (
        <div className="audio-control-popover">
          <label className="audio-control-row">
            <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />
            <span>開啟音效</span>
          </label>
          <label className="audio-control-row">
            <span>旁白</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={voiceVolume}
              disabled={muted}
              onChange={(e) => setVoiceVolume(Number(e.target.value))}
            />
          </label>
          <label className="audio-control-row">
            <span>音樂</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              disabled={muted}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
            />
          </label>
        </div>
      )}
    </div>
  );
}
