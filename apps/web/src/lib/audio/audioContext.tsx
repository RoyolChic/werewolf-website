import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LOOP_ASSETS_BY_SCENE, resolveAudioPath } from "./assets";

interface AudioContextValue {
  muted: boolean;
  /** Volume for one-shot narration/sfx cues (playCue). */
  voiceVolume: number;
  /** Volume for the continuous background loop (lobby/night/day music). */
  musicVolume: number;
  setMuted: (muted: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  /** Fires a one-shot narration/sfx clip by asset ID; no-ops silently if muted or unmapped. */
  playCue: (assetId: string) => void;
  /** Switches the single looping background bed to whichever scene's ambience track, if any. */
  setLoopScene: (scene: string | null) => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

const STORAGE_KEY = "kill-wolf-audio-settings";
const DEFAULT_VOICE_VOLUME = 0.7;
const DEFAULT_MUSIC_VOLUME = 0.3;

function loadSettings(): { muted: boolean; voiceVolume: number; musicVolume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Older versions of this app stored a single "volume" shared by both narration and music --
      // fall back to it for whichever of the two new fields isn't present yet, so upgrading
      // doesn't silently reset a returning player's saved level.
      const legacyVolume = typeof parsed.volume === "number" ? parsed.volume : null;
      return {
        muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
        voiceVolume: typeof parsed.voiceVolume === "number" ? parsed.voiceVolume : legacyVolume ?? DEFAULT_VOICE_VOLUME,
        musicVolume: typeof parsed.musicVolume === "number" ? parsed.musicVolume : legacyVolume ?? DEFAULT_MUSIC_VOLUME,
      };
    }
  } catch {
    // Corrupt or inaccessible storage -- fall back to defaults below.
  }
  return { muted: false, voiceVolume: DEFAULT_VOICE_VOLUME, musicVolume: DEFAULT_MUSIC_VOLUME };
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(loadSettings, []);
  const [muted, setMuted] = useState(initial.muted);
  const [voiceVolume, setVoiceVolume] = useState(initial.voiceVolume);
  const [musicVolume, setMusicVolume] = useState(initial.musicVolume);
  const loopAudioRef = useRef<HTMLAudioElement | null>(null);
  // What we *want* playing, regardless of whether the browser actually let it start yet -- kept
  // separate from the audio element's own paused/playing state, which the autoplay policy can
  // desync from this the moment a scene is requested before any user gesture has happened.
  const desiredSceneRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted, voiceVolume, musicVolume }));
    } catch {
      // Not essential -- the setting just won't survive a reload.
    }
  }, [muted, voiceVolume, musicVolume]);

  useEffect(() => {
    if (loopAudioRef.current) {
      loopAudioRef.current.volume = musicVolume;
      loopAudioRef.current.muted = muted;
    }
  }, [muted, musicVolume]);

  // Browsers block the very first play() attempt on a page until there's been a real user
  // gesture (click/tap/key) *on that page* -- loading a room straight from a pasted URL doesn't
  // count. setLoopScene() below can easily fire before that happens (a phase change is not a
  // gesture), so its play() silently fails and, without this, the loop would just stay silent
  // forever since nothing else ever calls setLoopScene again for the same scene. This retries the
  // loop the moment any interaction happens anywhere on the page.
  useEffect(() => {
    function retryLoop() {
      const loopAudio = loopAudioRef.current;
      if (loopAudio && desiredSceneRef.current && loopAudio.paused) {
        loopAudio.play().catch(() => {});
      }
    }
    document.addEventListener("pointerdown", retryLoop);
    document.addEventListener("keydown", retryLoop);
    return () => {
      document.removeEventListener("pointerdown", retryLoop);
      document.removeEventListener("keydown", retryLoop);
    };
  }, []);

  const value = useMemo<AudioContextValue>(() => {
    function playCue(assetId: string) {
      if (muted) return;
      const path = resolveAudioPath(assetId);
      if (!path) return;
      const audio = new Audio(path);
      audio.volume = voiceVolume;
      audio.play().catch((err) => {
        // Most commonly an autoplay block when this cue wasn't triggered by a direct click (e.g.
        // a narration line fired by another player's action). Logged so it's distinguishable
        // from a real playback error (bad path, unsupported format) instead of failing silently.
        console.warn(`[audio] cue "${assetId}" did not play:`, err?.name ?? err);
      });
    }

    function setLoopScene(scene: string | null) {
      if (scene === desiredSceneRef.current) return;
      desiredSceneRef.current = scene;

      if (!loopAudioRef.current) {
        loopAudioRef.current = new Audio();
        loopAudioRef.current.loop = true;
      }
      const loopAudio = loopAudioRef.current;
      const assetId = scene ? LOOP_ASSETS_BY_SCENE[scene] : null;
      const path = assetId ? resolveAudioPath(assetId) : null;
      if (!path) {
        loopAudio.pause();
        return;
      }
      loopAudio.src = path;
      loopAudio.volume = musicVolume;
      loopAudio.muted = muted;
      loopAudio.play().catch((err) => {
        console.warn(`[audio] loop "${scene}" blocked, will retry on next interaction:`, err?.name ?? err);
      });
    }

    return { muted, voiceVolume, musicVolume, setMuted, setVoiceVolume, setMusicVolume, playCue, setLoopScene };
  }, [muted, voiceVolume, musicVolume]);

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return ctx;
}
