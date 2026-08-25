# Werewolf Online — Audio Implementation Spec v0.2

> **Status:** Draft / Editable  
> **Purpose:** 作為狼人殺網站所有 BGM、Ambience、SFX、UI Sound、Narration 的唯一規格來源（Single Source of Truth）。  
> **Target reader:** Game Designer / Audio Designer / Frontend Engineer / Backend Engineer / Coding Agent  
> **Rule:** 未寫入本文件的正式音訊，不應直接接入 Production。  
> **Goal:** 當 Agent 同時取得本文件與所有音檔時，可以知道「哪個遊戲事件要播什麼、播給誰、何時開始、何時停止、如何淡入淡出，以及與其他聲音的互動方式」。

---

# 0. 使用方式

本文件同時扮演三種角色：

1. **Audio Direction**：定義整款遊戲的聲音世界觀。
2. **Runtime Contract**：定義程式端播放時機與規則。
3. **Production Checklist**：追蹤所有音效是否已生成、驗收、整合。

建議工作流程：

```text
Edit Spec
    ↓
Lock cue / asset definition
    ↓
Generate audio
    ↓
Audio QA
    ↓
Rename to canonical filename
    ↓
Place into /public/audio/
    ↓
Integrate runtime mapping
    ↓
In-game QA
    ↓
Mark checklist complete
```

---

# 1. 核心原則

## 1.1 世界觀

整體聲音風格：

**中世紀村莊 × 黑暗童話 × 克制的電影感**

聲音應該讓玩家感受到：

- 村莊被森林包圍。
- 白天相對安全，但仍有懸疑感。
- 夜晚代表未知、危險與秘密行動。
- 狼人不是廉價恐怖片怪物，而是潛伏在人群中的威脅。
- 玩家才是主角，音效不能持續搶戲。

避免：

- 綜藝節目式音效。
- 過度誇張的 Jump Scare。
- 每個操作都有巨大 Impact。
- 狼嚎過度頻繁。
- 白天突然變成歡樂農場。
- AI 客服感旁白。
- 過度戲劇化 RPG NPC 語氣。

---

# 2. Narrator Voice Bible

> **目前狀態：待最終定稿後再批次生成 Voice-over。**

## 2.1 建議人格

Narrator 不是系統客服，而是：

> 「知道這個村莊發生過很多事情、冷靜地見證每一個夜晚的說書人。」

建議音色：

- 成熟。
- 中性偏男聲。
- 約 30–40 歲感。
- 中低音域。
- 語速稍慢，但不能拖，要有抑揚頓挫。
- 神秘，不做作。
- 不使用綜藝主持語氣。
- 環境是曠野的聲音。

## 2.2 旁白語言規則

旁白分成兩種：

### Atmosphere Line

負責建立氣氛，可以稍微文學化。

例如：

> 最後一盞燈熄滅了，天黑請閉眼。

### Instruction Line

負責操作提示，必須簡短。

例如：

> 狼人，請睜眼。  
> 選擇今晚的目標。

### 原則

```text
Transition 可以有戲。
Gameplay Instruction 必須短。
重要資訊必須清楚。
重複率高的句子必須耐聽。
```

---

# 3. Runtime Timing Contract

## 3.1 時間單位

所有時間：

```text
milliseconds (ms)
```

禁止在程式碼中自行猜秒數。

---

## 3.2 時間基準

音訊不依賴「頁面載入多久」，而依賴 **Game Event Timestamp**。

每個 Server Event 應至少具有：

```yaml
event_id: string
event_type: string
server_timestamp_ms: int
phase_id: string
round_index: int
```

程式端播放時間：

```text
play_at =
server_timestamp_ms
+ cue.start_offset_ms
```

---

## 3.3 事件優先，而不是硬編整條 Timeline

角色流程不能假設旁白永遠都是固定 2.5 秒。

優先使用：

```text
previous_audio.onEnded
    + gap_after_ms
```

而不是：

```text
setTimeout(3000)
```

例如：

```text
wolf_open_voice
    ↓ onEnded
300 ms gap
    ↓
wolf_action_window_open
```

這樣未來替換語音長度時不需要重新改全部 timing。

---

# 4. Audio Scope

每個 Cue 必須指定播放對象。

```yaml
scope:
  broadcast
  team_private
  player_private
  local_ui
```

## broadcast

所有玩家都可以聽到。

例如：

- 天黑。
- 天亮。
- 投票開始。
- 勝負結果。

## team_private

只播放給特定陣營。

例如：

- 狼人隊伍確認操作成功的聲音。

## player_private

只播放給單一玩家。

例如：

- 預言家查驗結果。
- 女巫藥水操作。
- 守衛守護成功。

## local_ui

純本機 UI feedback，不應由 Server broadcast。

例如：

- Hover。
- Button click。
- 自己投票完成。

---

# 5. Audio Bus

程式端至少分成以下 Bus：

```yaml
music:
ambience:
narration:
sfx:
ui:
```

建議預設音量：

```yaml
music: 0.35
ambience: 0.30
narration: 1.00
sfx: 0.75
ui: 0.55
```

實際音量仍需 Audio QA 後微調。

---

# 6. Ducking Rules

Narration 播放期間：

```yaml
music:
  duck_to: 0.45
  attack_ms: 150
  release_ms: 500

ambience:
  duck_to: 0.65
  attack_ms: 150
  release_ms: 500
```

也就是：

```text
旁白開始
↓
BGM 降低 55%
Ambience 降低 35%
↓
旁白結束
↓
500ms 恢復
```

SFX 一般不 Duck。

---

# 7. Priority

```yaml
priority:
  critical_narration: 100
  phase_transition: 90
  role_result: 80
  countdown: 70
  action_confirm: 60
  environment: 30
  ui: 20
```

原則：

高 Priority Cue 可以打斷低 Priority One-shot。

Loop 不直接被 One-shot 停止，只套用 ducking。

---

# 8. Loop Rules

Loop 音檔必須：

```yaml
loop: true
loop_gap_ms: 0
```

Loop 不允許有明顯：

- 開頭撞擊聲。
- 結尾收尾音。
- 音量跳變。
- 長尾 Reverb 被截斷。

---

# 9. Canonical Asset Naming

路徑：

```text
/public/audio/
```

建議：

```text
audio/
├── music/
├── ambience/
├── narration/
├── sfx/
└── ui/
```

Filename：

```text
{category}_{scene}_{action}_{variant}.ogg
```

例如：

```text
music_lobby_loop_01.ogg
ambience_night_forest_01.ogg
narration_night_close_eyes_01.ogg
sfx_wolf_howl_distant_02.ogg
ui_vote_confirm_01.ogg
```

正式 Runtime **只引用 asset_id，不直接寫 filename**。

---

# 10. Cue Schema

本文件後續所有 Cue 應遵守：

```yaml
cue_id: string

trigger:
  event: string
  condition: optional

scope: broadcast | team_private | player_private | local_ui

schedule:
  start_offset_ms: int
  wait_for_previous_audio_end: bool
  gap_after_previous_ms: int

play:
  asset_id: string
  loop: bool
  volume: float
  fade_in_ms: int

stop:
  event: optional
  fade_out_ms: int

priority: int

concurrency_group: optional

notes: optional
```

---

# 11. Global Game Audio State Machine

```text
LOBBY
  ↓ GAME_STARTING
ROLE_REVEAL
  ↓
NIGHT_TRANSITION
  ↓
NIGHT_ROLE_ACTIONS
  ↓
DAWN_TRANSITION
  ↓
DAY_RESULT
  ↓
DISCUSSION
  ↓
VOTING
  ↓
VOTE_RESULT
  ├── NIGHT_TRANSITION
  └── GAME_RESULT
```

Audio Runtime 應以此 State Machine 為基礎。

---

# 12. Lobby Timeline

## 12.1 Enter Lobby

Event:

```text
LOBBY_ENTER
```

Timeline：

| Offset | Action |
|---:|---|
| +0 ms | Start `music.lobby.loop` fade-in 1200 ms |
| +300 ms | Start `ambience.lobby.fireplace` fade-in 1500 ms |

Cue：

```yaml
cue_id: lobby.enter.music
trigger:
  event: LOBBY_ENTER
scope: local_ui

schedule:
  start_offset_ms: 0

play:
  asset_id: music.lobby.loop
  loop: true
  volume: 0.35
  fade_in_ms: 1200

stop:
  event: GAME_STARTING
  fade_out_ms: 1000

priority: 30
```

---

## 12.2 Player Join

Event:

```text
PLAYER_JOINED
```

```yaml
cue_id: lobby.player_join
scope: broadcast

schedule:
  start_offset_ms: 0

play:
  asset_id: ui.lobby.player_join
  loop: false
  volume: 0.50
  fade_in_ms: 0

priority: 20

concurrency_group: lobby_presence
```

若 500 ms 內多人同時加入：

```text
最多播放一次。
```

避免連續疊加。

---

# 13. Game Start Timeline

Event：

```text
GAME_STARTING
```

建議 Game Start 3 秒倒數：

| Time | Cue |
|---:|---|
| T-3000 ms | lobby music fade-out |
| T-3000 ms | `ui.countdown.soft_tick` |
| T-2000 ms | `ui.countdown.soft_tick` |
| T-1000 ms | `ui.countdown.soft_tick_high` |
| T+0 ms | `sfx.game.start` |
| T+400 ms | Narration `voice.game.start` |
| Narration end + 600 ms | Enter ROLE_REVEAL / NIGHT |

---

# 14. Night Transition

Event：

```text
NIGHT_ENTER
```

Timeline：

| Offset | Action |
|---:|---|
| +0 ms | Day music / ambience begin fade-out 1200 ms |
| +0 ms | Night ambience fade-in 1800 ms |
| +400 ms | Night transition stinger |
| +1800 ms | Optional distant wolf howl |
| +2200 ms | Narration atmosphere line |
| narration end + 250 ms | Narration「天黑了，請閉眼」 |
| narration end + 500 ms | Begin first night role |

Cue：

```yaml
cue_id: phase.night.enter
trigger:
  event: NIGHT_ENTER
scope: broadcast

schedule:
  start_offset_ms: 0

play:
  asset_id: ambience.night.forest
  loop: true
  volume: 0.30
  fade_in_ms: 1800

stop:
  event: DAWN_ENTER
  fade_out_ms: 1500

priority: 30
```

---

# 15. Role Action Contract

每個夜晚角色使用同一個流程：

```text
ROLE_PHASE_ENTER
    ↓
role_open narration
    ↓ onEnded
300 ms
    ↓
ACTION_WINDOW_OPEN
    ↓
player action
    ↓
confirm / result sfx
    ↓
ACTION_WINDOW_CLOSE
    ↓
role_close narration
    ↓ onEnded
400 ms
    ↓
NEXT_ROLE
```

Action Timer **從 `ACTION_WINDOW_OPEN` 才開始計時**。

旁白播放時間不計入玩家思考時間。

---

# 16. Wolf Phase

Server Event：

```text
ROLE_WOLF_ENTER
```

Timeline：

| Relative point | Audio |
|---|---|
| Event + 0 ms | subtle `sfx.wolf.presence` |
| +250 ms | `voice.wolf.open` |
| voice end + 300 ms | Open wolf selection |
| target selected | private `ui.role.select` |
| wolf team confirmed | team-private `sfx.wolf.confirm` |
| action window close | wait 250 ms |
| +250 ms | `voice.wolf.close` |
| voice end + 400 ms | next role |

Notes：

- 狼嚎不應每個夜晚都播放。
- `wolf.presence` 使用低頻與細微獸性聲，不做 Jump Scare。
- 狼人選擇誰不能透過 Broadcast Audio 洩漏。

---

# 17. Guard Phase

```text
ROLE_GUARD_ENTER
```

| Relative point | Audio |
|---|---|
| +0 ms | `voice.guard.open` |
| voice end + 300 ms | action window open |
| select target | private UI select |
| confirm | `sfx.guard.protect` player-private |
| phase close | `voice.guard.close` |

---

# 18. Seer Phase

```text
ROLE_SEER_ENTER
```

| Relative point | Audio |
|---|---|
| +0 ms | `voice.seer.open` |
| voice end + 300 ms | selection enabled |
| selection | private UI select |
| result good | `sfx.seer.result_good` player-private |
| result wolf | `sfx.seer.result_wolf` player-private |
| result end + 600 ms | `voice.seer.close` |

重要：

```text
GOOD / WOLF result audio 絕對不能 broadcast。
```

---

# 19. Witch Phase

```text
ROLE_WITCH_ENTER
```

Timeline：

| Relative point | Audio |
|---|---|
| +0 ms | `voice.witch.open` |
| voice end + 300 ms | show night victim |
| if victim exists +300 ms | optional `voice.witch.victim_exists` |
| heal selected | `sfx.witch.heal` private |
| poison selected | `sfx.witch.poison` private |
| action complete +400 ms | `voice.witch.close` |

不要用 Broadcast 音效揭露女巫有沒有使用藥。

---

# 20. Hunter

Hunter 一般不需要固定夜間 Wake-up。

當死亡且技能可觸發：

```text
HUNTER_TRIGGER_AVAILABLE
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | `sfx.hunter.trigger` |
| +500 ms | hunter private instruction voice |
| player shoots | `sfx.hunter.shot` broadcast |
| +900 ms | target death transition |

---

# 21. Knight

Event：

```text
KNIGHT_DUEL_START
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | `sfx.knight.draw_sword` |
| +350 ms | duel visual begins |
| result +0 ms | success/fail stinger |
| result +700 ms | death / continue flow |

---

# 22. Idiot

Event：

```text
IDIOT_REVEALED
```

建議不要使用搞笑 clown sound。

使用：

```text
短促、古怪但不滑稽的木質 / 鈴聲 motif。
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | reveal stinger |
| +500 ms | special identity UI reveal |

---

# 23. White Wolf King

Trigger：

```text
WHITE_WOLF_KING_EXPLODE
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | silence / music duck |
| +150 ms | charge low-frequency sound |
| +800 ms | heavy impact / wolf burst |
| +1200 ms | target death result |

---

# 24. Wolf Beauty

魅惑目標：

```text
WOLF_BEAUTY_CHARM_CONFIRM
```

只對 Wolf Beauty 玩家播放 private confirmation。

死亡連帶觸發：

```text
WOLF_BEAUTY_LINK_TRIGGER
```

此時可以 broadcast 特殊連鎖死亡 SFX。

---

# 25. Hidden Wolf

原則：

**Hidden Wolf 的存在不能被任何特殊 Broadcast Audio 暗示。**

因此：

```text
no unique public wakeup cue
no public identity motif
```

只有本人 local/private feedback。

---

# 26. Dawn Transition

Event：

```text
DAWN_ENTER
```

Timeline：

| Offset | Action |
|---:|---|
| +0 ms | Night ambience fade-out 1600 ms |
| +0 ms | Low night music fade-out 1200 ms |
| +400 ms | Dawn transition sound |
| +900 ms | Bird ambience fade-in |
| +1300 ms | Day ambience fade-in |
| +1800 ms | Narration dawn atmosphere |
| narration end + 250 ms | `voice.day.open_eyes` |
| voice end + 500 ms | Resolve night result |

---

# 27. Night Result

## No Death

Event：

```text
NIGHT_RESULT_NONE
```

Sequence：

```text
voice.result.no_death
↓
500 ms
↓
discussion transition
```

## One Death

Event：

```text
NIGHT_RESULT_DEATH
```

Sequence：

```text
sfx.result.death_reveal
↓ 500 ms
voice.result.death
↓
UI reveal
```

## Multiple Deaths

Event：

```text
NIGHT_RESULT_MULTI_DEATH
```

不要每一個人各播一次巨大死亡 SFX。

建議：

```text
one reveal stinger
↓
all result cards appear
↓
narration summary
```

---

# 28. Discussion Phase

Event：

```text
DISCUSSION_ENTER
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | day music fade-in 800 ms |
| +200 ms | `voice.discussion.start` |
| voice end +300 ms | discussion timer begins |

討論期間：

```text
Narrator silence.
```

玩家說話才是主體。

---

# 29. Discussion Countdown

Timer 只在以下時間點提示：

```text
30 seconds remaining
10 seconds remaining
5
4
3
2
1
time up
```

Timeline：

```yaml
30s:
  asset: ui.timer.30sec
  scope: broadcast

10s:
  asset: ui.timer.10sec
  scope: broadcast

5..1:
  asset: ui.timer.tick
  scope: broadcast

0:
  asset: ui.timer.end
  scope: broadcast
```

禁止：

```text
30, 29, 28, 27...
```

全程倒數。

---

# 30. Voting Phase

Event：

```text
VOTING_ENTER
```

Timeline：

| Offset | Action |
|---:|---|
| +0 ms | Day BGM fade to 60% |
| +0 ms | Voting pulse BGM fade-in 600 ms |
| +300 ms | `voice.vote.start` |
| voice end +300 ms | voting enabled |

Vote cast：

```text
ui.vote.select
```

只播放 local_ui。

Vote confirmed：

```text
ui.vote.confirm
```

只播放 local_ui。

不要因為某玩家投票就播放全場聲音，以免造成資訊噪音。

---

# 31. Vote Countdown

建議：

```text
10 sec warning
5 sec tick
4 sec tick
3 sec tick
2 sec tick
1 sec tick
time up
```

可與 Discussion Countdown 共用 asset。

---

# 32. Vote Reveal

Event：

```text
VOTE_REVEAL
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | voting BGM stop / fade 350 ms |
| +200 ms | vote reveal stinger |
| +700 ms | UI votes reveal |
| result +300 ms | tie / exile cue |

Tie：

```text
sfx.vote.tie
```

Exile：

```text
sfx.vote.exile
```

---

# 33. Last Words

如果遊戲規則允許遺言：

```text
LAST_WORDS_ENTER
```

Timeline：

```text
exile result
↓
800 ms
↓
voice.last_words.start
↓ onEnded
300 ms
↓
last words timer begins
```

---

# 34. Game Result

Before result：

```text
stop all transient cues
fade music / ambience to 30%
```

---

## 34.1 Village Win

Event：

```text
GAME_RESULT_VILLAGE
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | silence emphasis / existing BGM duck |
| +300 ms | village victory stinger |
| +900 ms | narrator result |
| narrator end +300 ms | village result music loop |
| +1500 ms | results UI fully visible |

---

## 34.2 Wolf Win

Event：

```text
GAME_RESULT_WOLF
```

Timeline：

| Offset | Audio |
|---:|---|
| +0 ms | day/night ambience fade down |
| +250 ms | low wolf victory motif |
| +800 ms | optional distant howl |
| +1200 ms | narrator result |
| narrator end +300 ms | wolf result music |

---

# 35. Recommended Narration Script List

| Asset ID | Draft Line |
|---|---|
| voice.game.start | 遊戲，開始。 |
| voice.night.atmosphere | 最後一盞燈熄滅了。 |
| voice.night.close_eyes | 天黑請閉眼。 |
| voice.wolf.open | 狼人，請睜眼。 |
| voice.wolf.choose | 選擇今晚要襲擊的目標。 |
| voice.wolf.close | 狼人，請閉眼。 |
| voice.guard.open | 守衛，請睜眼。 |
| voice.guard.choose | 選擇今晚要守護的人。 |
| voice.guard.close | 守衛，請閉眼。 |
| voice.seer.open | 預言家，請睜眼。 |
| voice.seer.choose | 選擇你想查驗的人。他的身分是...。 |
| voice.seer.close | 預言家，請閉眼。 |
| voice.witch.open | 女巫，請睜眼。 |
| voice.witch.victim_exists | 今晚，他被殺了。妳要使用解藥嗎? 妳要使用毒藥嗎? |
| voice.witch.close | 女巫，請閉眼。 |
| voice.day.atmosphere | 鐘聲響起，新的一天開始了。 |
| voice.day.open_eyes | 天亮了。 |
| voice.result.no_death | 昨夜，無人死亡。 |
| voice.discussion.start | 現在，開始發言。 |
| voice.vote.start | 請做出你的選擇。 |
| voice.last_words.start | 請留下最後的話。 |
| voice.result.village_win | 狼人的蹤跡消失了。村莊迎來了黎明，好人勝利。 |
| voice.result.wolf_win | 最後的燈火熄滅了。狼人占領了村莊，狼人勝利。 |

---

# 36. Asset Registry

## Music

| Asset ID | Filename | Loop | Status |
|---|---|---:|---|
| music.lobby.loop | music_lobby_loop_01.ogg | yes | TODO |
| music.night.loop | music_night_loop_01.ogg | yes | TODO |
| music.day.loop | music_day_loop_01.ogg | yes | TODO |
| music.vote.loop | music_vote_loop_01.ogg | yes | TODO |
| music.result.village | music_result_village_01.ogg | yes | TODO |
| music.result.wolf | music_result_wolf_01.ogg | yes | TODO |

## Ambience

| Asset ID | Filename | Loop | Status |
|---|---|---:|---|
| ambience.lobby.fireplace | ambience_lobby_fireplace_01.ogg | yes | TODO |
| ambience.night.forest | ambience_night_forest_01.ogg | yes | TODO |
| ambience.day.village | ambience_day_village_01.ogg | yes | TODO |
| ambience.day.birds | ambience_day_birds_01.ogg | yes | TODO |

## Transitions / General SFX

| Asset ID | Filename | Status |
|---|---|---|
| sfx.game.start | sfx_game_start_01.ogg | TODO |
| sfx.phase.nightfall | sfx_phase_nightfall_01.ogg | TODO |
| sfx.phase.dawn | sfx_phase_dawn_01.ogg | TODO |
| sfx.wolf.howl_distant | sfx_wolf_howl_distant_01.ogg | TODO |
| sfx.result.death_reveal | sfx_result_death_reveal_01.ogg | TODO |
| sfx.vote.reveal | sfx_vote_reveal_01.ogg | TODO |
| sfx.vote.tie | sfx_vote_tie_01.ogg | TODO |
| sfx.vote.exile | sfx_vote_exile_01.ogg | TODO |

## Role SFX

| Asset ID | Filename | Status |
|---|---|---|
| sfx.wolf.presence | sfx_wolf_presence_01.ogg | TODO |
| sfx.wolf.confirm | sfx_wolf_confirm_01.ogg | TODO |
| sfx.guard.protect | sfx_guard_protect_01.ogg | TODO |
| sfx.seer.result_good | sfx_seer_result_good_01.ogg | TODO |
| sfx.seer.result_wolf | sfx_seer_result_wolf_01.ogg | TODO |
| sfx.witch.heal | sfx_witch_heal_01.ogg | TODO |
| sfx.witch.poison | sfx_witch_poison_01.ogg | TODO |
| sfx.hunter.trigger | sfx_hunter_trigger_01.ogg | TODO |
| sfx.hunter.shot | sfx_hunter_shot_01.ogg | TODO |
| sfx.knight.draw_sword | sfx_knight_draw_sword_01.ogg | TODO |
| sfx.knight.success | sfx_knight_success_01.ogg | TODO |
| sfx.knight.fail | sfx_knight_fail_01.ogg | TODO |
| sfx.idiot.reveal | sfx_idiot_reveal_01.ogg | TODO |
| sfx.white_wolf_king.charge | sfx_white_wolf_king_charge_01.ogg | TODO |
| sfx.white_wolf_king.explode | sfx_white_wolf_king_explode_01.ogg | TODO |
| sfx.wolf_beauty.charm | sfx_wolf_beauty_charm_01.ogg | TODO |
| sfx.wolf_beauty.link | sfx_wolf_beauty_link_01.ogg | TODO |

## UI / Timer

| Asset ID | Filename | Status |
|---|---|---|
| ui.lobby.player_join | ui_lobby_player_join_01.ogg | TODO |
| ui.lobby.player_leave | ui_lobby_player_leave_01.ogg | TODO |
| ui.ready | ui_ready_01.ogg | TODO |
| ui.role.select | ui_role_select_01.ogg | TODO |
| ui.role.confirm | ui_role_confirm_01.ogg | TODO |
| ui.vote.select | ui_vote_select_01.ogg | TODO |
| ui.vote.confirm | ui_vote_confirm_01.ogg | TODO |
| ui.timer.30sec | ui_timer_30sec_01.ogg | TODO |
| ui.timer.10sec | ui_timer_10sec_01.ogg | TODO |
| ui.timer.tick | ui_timer_tick_01.ogg | TODO |
| ui.timer.end | ui_timer_end_01.ogg | TODO |

---

# 37. Narration Registry

| Asset ID | Filename | Status |
|---|---|---|
| voice.game.start | narration_game_start_01.ogg | TODO |
| voice.night.atmosphere | narration_night_atmosphere_01.ogg | TODO |
| voice.night.close_eyes | narration_night_close_eyes_01.ogg | TODO |
| voice.wolf.open | narration_wolf_open_01.ogg | TODO |
| voice.wolf.choose | narration_wolf_choose_01.ogg | TODO |
| voice.wolf.close | narration_wolf_close_01.ogg | TODO |
| voice.guard.open | narration_guard_open_01.ogg | TODO |
| voice.guard.choose | narration_guard_choose_01.ogg | TODO |
| voice.guard.close | narration_guard_close_01.ogg | TODO |
| voice.seer.open | narration_seer_open_01.ogg | TODO |
| voice.seer.choose | narration_seer_choose_01.ogg | TODO |
| voice.seer.close | narration_seer_close_01.ogg | TODO |
| voice.witch.open | narration_witch_open_01.ogg | TODO |
| voice.witch.victim_exists | narration_witch_victim_exists_01.ogg | TODO |
| voice.witch.close | narration_witch_close_01.ogg | TODO |
| voice.day.atmosphere | narration_day_atmosphere_01.ogg | TODO |
| voice.day.open_eyes | narration_day_open_eyes_01.ogg | TODO |
| voice.result.no_death | narration_result_no_death_01.ogg | TODO |
| voice.discussion.start | narration_discussion_start_01.ogg | TODO |
| voice.vote.start | narration_vote_start_01.ogg | TODO |
| voice.last_words.start | narration_last_words_start_01.ogg | TODO |
| voice.result.village_win | narration_result_village_win_01.ogg | TODO |
| voice.result.wolf_win | narration_result_wolf_win_01.ogg | TODO |

---

# 38. Production Checklist

每個 Asset 完成需經過四個 Gate：

```text
[GEN] Generated
[QA] Audio QA passed
[FILE] Canonical filename / location correct
[INT] Integrated and tested in game
```

## Music

- [ ] `music.lobby.loop` — GEN / QA / FILE / INT
- [ ] `music.night.loop` — GEN / QA / FILE / INT
- [ ] `music.day.loop` — GEN / QA / FILE / INT
- [ ] `music.vote.loop` — GEN / QA / FILE / INT
- [ ] `music.result.village` — GEN / QA / FILE / INT
- [ ] `music.result.wolf` — GEN / QA / FILE / INT

## Ambience

- [ ] `ambience.lobby.fireplace` — GEN / QA / FILE / INT
- [ ] `ambience.night.forest` — GEN / QA / FILE / INT
- [ ] `ambience.day.village` — GEN / QA / FILE / INT
- [ ] `ambience.day.birds` — GEN / QA / FILE / INT

## General / Transition

- [ ] `sfx.game.start` — GEN / QA / FILE / INT
- [ ] `sfx.phase.nightfall` — GEN / QA / FILE / INT
- [ ] `sfx.phase.dawn` — GEN / QA / FILE / INT
- [ ] `sfx.wolf.howl_distant` — GEN / QA / FILE / INT
- [ ] `sfx.result.death_reveal` — GEN / QA / FILE / INT
- [ ] `sfx.vote.reveal` — GEN / QA / FILE / INT
- [ ] `sfx.vote.tie` — GEN / QA / FILE / INT
- [ ] `sfx.vote.exile` — GEN / QA / FILE / INT

## Role SFX

- [ ] `sfx.wolf.presence` — GEN / QA / FILE / INT
- [ ] `sfx.wolf.confirm` — GEN / QA / FILE / INT
- [ ] `sfx.guard.protect` — GEN / QA / FILE / INT
- [ ] `sfx.seer.result_good` — GEN / QA / FILE / INT
- [ ] `sfx.seer.result_wolf` — GEN / QA / FILE / INT
- [ ] `sfx.witch.heal` — GEN / QA / FILE / INT
- [ ] `sfx.witch.poison` — GEN / QA / FILE / INT
- [ ] `sfx.hunter.trigger` — GEN / QA / FILE / INT
- [ ] `sfx.hunter.shot` — GEN / QA / FILE / INT
- [ ] `sfx.knight.draw_sword` — GEN / QA / FILE / INT
- [ ] `sfx.knight.success` — GEN / QA / FILE / INT
- [ ] `sfx.knight.fail` — GEN / QA / FILE / INT
- [ ] `sfx.idiot.reveal` — GEN / QA / FILE / INT
- [ ] `sfx.white_wolf_king.charge` — GEN / QA / FILE / INT
- [ ] `sfx.white_wolf_king.explode` — GEN / QA / FILE / INT
- [ ] `sfx.wolf_beauty.charm` — GEN / QA / FILE / INT
- [ ] `sfx.wolf_beauty.link` — GEN / QA / FILE / INT

## UI / Timer

- [ ] `ui.lobby.player_join` — GEN / QA / FILE / INT
- [ ] `ui.lobby.player_leave` — GEN / QA / FILE / INT
- [ ] `ui.ready` — GEN / QA / FILE / INT
- [ ] `ui.role.select` — GEN / QA / FILE / INT
- [ ] `ui.role.confirm` — GEN / QA / FILE / INT
- [ ] `ui.vote.select` — GEN / QA / FILE / INT
- [ ] `ui.vote.confirm` — GEN / QA / FILE / INT
- [ ] `ui.timer.30sec` — GEN / QA / FILE / INT
- [ ] `ui.timer.10sec` — GEN / QA / FILE / INT
- [ ] `ui.timer.tick` — GEN / QA / FILE / INT
- [ ] `ui.timer.end` — GEN / QA / FILE / INT

## Narration

- [ ] `voice.game.start` — GEN / QA / FILE / INT
- [ ] `voice.night.atmosphere` — GEN / QA / FILE / INT
- [ ] `voice.night.close_eyes` — GEN / QA / FILE / INT
- [ ] `voice.wolf.open` — GEN / QA / FILE / INT
- [ ] `voice.wolf.choose` — GEN / QA / FILE / INT
- [ ] `voice.wolf.close` — GEN / QA / FILE / INT
- [ ] `voice.guard.open` — GEN / QA / FILE / INT
- [ ] `voice.guard.choose` — GEN / QA / FILE / INT
- [ ] `voice.guard.close` — GEN / QA / FILE / INT
- [ ] `voice.seer.open` — GEN / QA / FILE / INT
- [ ] `voice.seer.choose` — GEN / QA / FILE / INT
- [ ] `voice.seer.close` — GEN / QA / FILE / INT
- [ ] `voice.witch.open` — GEN / QA / FILE / INT
- [ ] `voice.witch.victim_exists` — GEN / QA / FILE / INT
- [ ] `voice.witch.close` — GEN / QA / FILE / INT
- [ ] `voice.day.atmosphere` — GEN / QA / FILE / INT
- [ ] `voice.day.open_eyes` — GEN / QA / FILE / INT
- [ ] `voice.result.no_death` — GEN / QA / FILE / INT
- [ ] `voice.discussion.start` — GEN / QA / FILE / INT
- [ ] `voice.vote.start` — GEN / QA / FILE / INT
- [ ] `voice.last_words.start` — GEN / QA / FILE / INT
- [ ] `voice.result.village_win` — GEN / QA / FILE / INT
- [ ] `voice.result.wolf_win` — GEN / QA / FILE / INT

---

# 39. Audio QA Checklist

每個音檔至少確認：

- [ ] 沒有 clipping。
- [ ] 音量和同類 Asset 接近。
- [ ] 沒有不必要的 silence。
- [ ] One-shot 結尾沒有被切斷。
- [ ] Loop 可以無縫循環。
- [ ] Voice pronunciation 正確。
- [ ] Voice 語速符合遊戲節奏。
- [ ] 音效不會蓋過語音聊天。
- [ ] Private cue 不會在其他玩家 Client 播放。
- [ ] 手機與桌面瀏覽器皆可正常播放。

---

# 40. Runtime QA Checklist

程式整合後確認：

- [ ] Lobby → Game transition 無重疊問題。
- [ ] Day / Night BGM 正確 crossfade。
- [ ] Narration 播放時 BGM 正確 duck。
- [ ] Role action timer 不包含 Narration 時間。
- [ ] Narration 結束後才開放操作。
- [ ] Seer result 僅本人聽見。
- [ ] Witch action 不會洩漏給其他玩家。
- [ ] Hidden Wolf 沒有 Public Audio 暗示。
- [ ] Countdown cue 不重複。
- [ ] Vote cast 不會全場狂響。
- [ ] Reload / reconnect 不會重播已結束的 One-shot。
- [ ] Game end 能停止所有舊 Phase Loop。
- [ ] Audio mute / master volume 設定有效。

---

# 41. Reconnect / Late Event Policy

若 Client 收到 Event 時，預定播放時間已經過去：

## One-shot

```text
lateness <= 500 ms:
    play immediately

lateness > 500 ms:
    skip
```

## Narration

```text
如果該 Narration 仍屬於目前有效 Phase：
    可播放

如果 Phase 已結束：
    skip
```

## Loop

```text
永遠以目前 Game State 為準。
```

例如 Reload 時正在 Night：

```text
直接恢復 night ambience / music。
不要重新播放 nightfall transition。
```

---

# 42. Audio Variant Policy

環境音與狼嚎可有 Variation：

```yaml
sfx.wolf.howl_distant:
  variants:
    - 01
    - 02
    - 03
```

選擇方式應 deterministic：

```text
variant_index =
hash(game_id + round_index + cue_id)
% variant_count
```

避免每個 Client 播到不同版本。

---

# 43. Future Machine-readable Manifest

未來建議從本 Spec 萃取：

```text
audio_manifest.yaml
audio_cues.yaml
```

例如：

```yaml
assets:
  music.night.loop:
    file: /audio/music/music_night_loop_01.ogg
    bus: music
    loop: true

cues:
  phase.night.enter:
    trigger: NIGHT_ENTER
    actions:
      - type: play
        asset: ambience.night.forest
        at_ms: 0
        fade_in_ms: 1800

      - type: play
        asset: sfx.phase.nightfall
        at_ms: 400

      - type: play
        asset: voice.night.atmosphere
        after_ms: 2200

      - type: play
        asset: voice.night.close_eyes
        after_previous_end_ms: 250
```

Coding Agent 不應自行創造未定義 Cue。

若 Implementation 發現缺少 Cue：

```text
先回到本 Spec 新增定義
→ 再修改 Runtime
```

---

# 44. Definition of Done

單一 Asset 只有在以下全部完成時才能標記 DONE：

```text
Generated
+ Audio QA Passed
+ Canonical Filename
+ Registry Updated
+ Runtime Integrated
+ In-game Tested
```

整個 Audio Pack 只有在：

```text
Asset Registry 無 TODO
Production Checklist 全部完成
Runtime QA Checklist 通過
```

後才視為 v1 完成。

---

# 45. Next Review Items

在開始正式生成前，需要一起定稿：

- [ ] Narrator 性別感 / 年齡感。
- [ ] Narrator 語速。
- [ ] Narrator 情緒強度。
- [ ] 所有旁白台詞。
- [ ] Lobby 音樂方向。
- [ ] Night 音樂方向。
- [ ] Day 音樂方向。
- [ ] Voting 音樂方向。
- [ ] 狼人 Sound Motif。
- [ ] 預言家 Sound Motif。
- [ ] 女巫 Sound Motif。
- [ ] 勝利音樂方向。
- [ ] 是否所有玩家都聽 Narrator，或依角色做 Private Narration。
- [ ] 實際 Game State / Server Event 名稱是否與本文件一致。

---

# 46. Change Log

## v0.2

- 將 Audio Spec 從素材清單提升為 Runtime Contract。
- 加入 Server Event-based timing。
- 加入 scope / privacy 規則。
- 加入 BGM ducking / priority / concurrency。
- 加入 Night / Role / Dawn / Discussion / Vote / Result 完整 Timeline。
- 加入 reconnect policy。
- 加入 production / runtime QA checklist。
- 加入未來 machine-readable manifest 格式。

