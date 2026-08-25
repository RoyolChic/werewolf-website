# Werewolf Audio Generation Checklist

## Locked Narrator
- [x] Voice direction: B2 / deep male voice
- [x] Prosody: line-break pause style approved
- [x] Narration wording: keep v0.2 exactly
- [x] 23 narration assets generated in external voice tool
- [ ] Export/download generated narration binaries into `/narration/`
- [ ] Convert/rename to canonical `.ogg` filenames
- [ ] Per-file pronunciation and clipping QA

## P0 Remaining
- [ ] Night/day/vote/result music
- [ ] Night/day ambience
- [ ] Game start/nightfall/dawn/death/vote/exile SFX
- [ ] Core UI select/confirm/countdown cues

## Runtime QA
- [ ] Private role narration reaches authorized client only
- [ ] Narration end gates action window start
- [ ] BGM/ambience duck during narration
- [ ] Reconnect does not replay expired one-shots
- [ ] No hidden-role leak via public audio
