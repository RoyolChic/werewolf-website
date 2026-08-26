/**
 * Curated lookup from the werewolf_audio_bundle's asset IDs (see
 * apps/web/public/audio/werewolf_audio_bundle/audio_manifest.json and AGENT_IMPLEMENTATION.md)
 * to the actual files present on disk right now.
 *
 * The manifest's own `file` field is only reliable for ambience/sfx/ui/music -- those were
 * dropped in using the manifest's canonical English filenames. The narration clips were recorded
 * separately and dropped in under their own Chinese filenames, so they're mapped by hand below.
 * A handful of narration lines (the guard's three cues, and the wolves' "please close your eyes"
 * cue) have no matching audio file yet; they're left out entirely and simply won't play until a
 * matching file is added here.
 */

import { withBase } from "../assetPath";

const BASE = withBase("/audio/werewolf_audio_bundle");

export type AudioScope = "broadcast" | "team_private" | "player_private";

export interface AudioAssetDef {
  file: string;
  scope: AudioScope;
}

export const AUDIO_ASSETS: Record<string, AudioAssetDef> = {
  // -- narration (hand-mapped to the actual Chinese filenames on disk) --
  "voice.game.start": { file: "narration/遊戲開始.mp3", scope: "broadcast" },
  "voice.night.atmosphere": { file: "narration/最後一盞燈熄滅了.mp3", scope: "broadcast" },
  "voice.night.close_eyes": { file: "narration/天黑請閉眼.mp3", scope: "broadcast" },
  "voice.wolf.open": { file: "narration/狼人遊戲指令.mp3", scope: "team_private" },
  "voice.wolf.choose": { file: "narration/襲擊目標選擇.mp3", scope: "team_private" },
  "voice.seer.open": { file: "narration/預言家睜眼.mp3", scope: "player_private" },
  "voice.seer.choose": { file: "narration/選擇查驗對象.mp3", scope: "player_private" },
  "voice.seer.close": { file: "narration/預言家閉眼.mp3", scope: "player_private" },
  "voice.witch.open": { file: "narration/女巫請睜眼.mp3", scope: "player_private" },
  "voice.witch.victim_exists": { file: "narration/選擇解藥或毒藥.mp3", scope: "player_private" },
  "voice.witch.close": { file: "narration/女巫閉眼遊戲.mp3", scope: "player_private" },
  "voice.day.atmosphere": { file: "narration/新一天的開始.mp3", scope: "broadcast" },
  "voice.day.open_eyes": { file: "narration/天亮了.mp3", scope: "broadcast" },
  "voice.result.no_death": { file: "narration/昨夜無人死亡.mp3", scope: "broadcast" },
  "voice.discussion.start": { file: "narration/開始發言.mp3", scope: "broadcast" },
  "voice.vote.start": { file: "narration/做出選擇.mp3", scope: "broadcast" },
  "voice.last_words.start": { file: "narration/最後的話.mp3", scope: "broadcast" },
  "voice.result.village_win": { file: "narration/狼人消失結局.mp3", scope: "broadcast" },
  "voice.result.wolf_win": { file: "narration/狼人勝利結局.mp3", scope: "broadcast" },

  // -- sfx (filenames match the manifest exactly) --
  "sfx.phase.nightfall": { file: "sfx/sfx_phase_nightfall_01.ogg", scope: "broadcast" },
  "sfx.phase.dawn": { file: "sfx/sfx_phase_dawn_01.ogg", scope: "broadcast" },
  "sfx.result.death_reveal": { file: "sfx/sfx_result_death_reveal_01.ogg", scope: "broadcast" },
  "sfx.vote.exile": { file: "sfx/sfx_vote_exile_01.ogg", scope: "broadcast" },
  "sfx.vote.tie": { file: "sfx/sfx_vote_tie_01.ogg", scope: "broadcast" },
  "sfx.wolf.confirm": { file: "sfx/sfx_wolf_confirm_01.ogg", scope: "team_private" },
  "sfx.guard.protect": { file: "sfx/sfx_guard_protect_01.ogg", scope: "player_private" },
  "sfx.seer.result_good": { file: "sfx/sfx_seer_result_good_01.ogg", scope: "player_private" },
  "sfx.seer.result_wolf": { file: "sfx/sfx_seer_result_wolf_01.ogg", scope: "player_private" },
  "sfx.witch.heal": { file: "sfx/sfx_witch_heal_01.ogg", scope: "player_private" },
  "sfx.witch.poison": { file: "sfx/sfx_witch_poison_01.ogg", scope: "player_private" },
  "sfx.hunter.trigger": { file: "sfx/sfx_hunter_trigger_01.ogg", scope: "player_private" },
  "sfx.hunter.shot": { file: "sfx/sfx_hunter_shot_01.ogg", scope: "broadcast" },
  "sfx.knight.draw_sword": { file: "sfx/sfx_knight_draw_sword_01.ogg", scope: "broadcast" },
  "sfx.knight.success": { file: "sfx/sfx_knight_success_01.ogg", scope: "broadcast" },
  "sfx.knight.fail": { file: "sfx/sfx_knight_fail_01.ogg", scope: "broadcast" },

  // -- ui (always local to whoever clicked; scope is irrelevant but kept for a uniform shape) --
  "ui.role.select": { file: "ui/ui_role_select_01.ogg", scope: "broadcast" },
  "ui.role.confirm": { file: "ui/ui_role_confirm_01.ogg", scope: "broadcast" },
  "ui.vote.select": { file: "ui/ui_vote_select_01.ogg", scope: "broadcast" },
  "ui.vote.confirm": { file: "ui/ui_vote_confirm_01.ogg", scope: "broadcast" },

  // -- ambience / music loops --
  "ambience.lobby.fireplace": { file: "ambience/ambience_lobby_fireplace_01.ogg", scope: "broadcast" },
  "ambience.night.forest": { file: "ambience/ambience_night_forest_01.ogg", scope: "broadcast" },
  "ambience.day.village": { file: "ambience/ambience_day_village_01.ogg", scope: "broadcast" },
  "music.night.loop": { file: "music/music_night_loop_01.mp3", scope: "broadcast" },
  "music.lobby.loop": { file: "music/music_lobby_loop_01.mp3", scope: "broadcast" },
};

export function resolveAudioPath(assetId: string): string | null {
  const asset = AUDIO_ASSETS[assetId];
  return asset ? `${BASE}/${asset.file}` : null;
}

/** Loops meant to run continuously behind whatever's on screen, keyed by a coarse scene name. */
export const LOOP_ASSETS_BY_SCENE: Record<string, string> = {
  lobby: "music.lobby.loop",
  night: "ambience.night.forest",
  day: "ambience.day.village",
};
