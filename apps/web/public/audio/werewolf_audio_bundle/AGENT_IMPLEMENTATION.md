# Werewolf Audio — Coding Agent Implementation Guide v0.3

## 1. Authority
`werewolf_audio_spec.md` remains the gameplay/audio design source of truth. This guide records the production decisions approved after v0.2 review. Do **not** rewrite narration text.

## 2. Locked Narrator
- Voice: approved **B2 / deep male** direction.
- Performance: use line-break pauses as generation-only prosody hints.
- Important: line breaks do not change canonical narration text.
- Role name and instruction should sound like two rhythm units, e.g. `狼人，` then `請睜眼。`
- Avoid extra role-specific voices. One narrator identity across the entire game.

## 3. Scope Decision
Use these scopes unless the server game mode explicitly overrides them:
- Game / night / dawn / discussion / voting / result narration: `broadcast`
- Wolf open/choose/close narration: `team_private`
- Guard / Seer / Witch narration: `player_private`
- Seer result and Witch action/result SFX: `player_private`
- Hunter instruction before firing: `player_private`; hunter shot after commit: `broadcast`
- Hidden Wolf: no public unique cue

The server should preferably emit private audio events only to authorized clients. Do not broadcast sensitive events and rely only on client-side filtering.

## 4. Runtime Rules
1. Runtime references `asset_id`, never hard-coded filename.
2. Play time = `server_timestamp_ms + start_offset_ms`.
3. Prefer `previous_audio.onEnded + gap_after_ms` over fixed timers.
4. Role action timer begins only after opening narration finishes.
5. Narration bus ducks music and ambience according to the v0.2 spec.
6. One foreground cue at a time where possible. Avoid stacking role-confirm + generic confirm.
7. For reconnect, loops restore from current state; expired one-shots are skipped.

## 5. Audio Density Decisions
- Do not play distant wolf howl every night. Treat as P2/occasional atmosphere.
- Do not stack day music and voting music indefinitely; crossfade into voting music.
- Avoid simultaneous generic `ui.role.confirm` and role-specific confirmation SFX.
- Vote cast/select remains local UI only.
- Discussion narration is intentionally minimal; players are the foreground.

## 6. Known Spec Gaps — Agent Must Not Invent
The v0.2 timeline references items not formally registered. Do not silently invent them in code:
- `ui.countdown.soft_tick`
- `ui.countdown.soft_tick_high`
- `voice.result.death`
- Hunter private instruction voice
- Multi-death narration summary
- Village victory stinger
- Wolf victory motif

Until the spec is revised, either leave these unimplemented or map only where an explicit product decision exists. Do not create new canonical IDs ad hoc.

## 7. Registry Orphans / Alignment Items
Review before wiring:
- `music.night.loop` exists but v0.2 NIGHT_ENTER does not explicitly start it.
- `voice.wolf.choose`, `voice.guard.choose`, `voice.seer.choose` exist but role timelines do not explicitly invoke them.
- `ui.lobby.player_leave`, `ui.ready`, `ui.role.confirm` lack complete runtime trigger definitions.

## 8. Folder Contract
```text
werewolf_audio/
├── music/
├── ambience/
├── narration/
├── sfx/
├── ui/
├── audio_manifest.json
├── audio_generation_status.csv
├── generation_checklist.md
├── werewolf_audio_spec.md
└── AGENT_IMPLEMENTATION.md
```

## 9. Manifest Contract
For each asset resolve:
`Asset ID -> Filename -> Trigger -> Scope -> Timing -> Audio File -> QA Status`.

`audio_manifest.json` is the machine-readable lookup. `audio_generation_status.csv` is production tracking.

## 10. Current Production State
- Narrator audition direction: APPROVED.
- 23 narration generations: COMPLETE in voice-generation service.
- Narration binary export into this ZIP: NOT COMPLETE (tool exposes external playback/download URLs but the current file sandbox cannot fetch those generated binaries).
- SFX / ambience / BGM generation: NOT STARTED.

Do not mark an asset `DONE` until Generated + Audio QA + canonical filename + runtime integration + in-game QA are all complete.
