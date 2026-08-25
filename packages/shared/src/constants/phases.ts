import type { GamePhase } from "../types/phase";

export const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: "等待房",
  CARD_PICKING: "選牌",
  ROLE_REVEAL: "確認角色",
  NIGHT_START: "夜晚降臨",
  NIGHT_GUARD: "守衛行動",
  NIGHT_WEREWOLF: "狼人行動",
  NIGHT_SEER: "預言家行動",
  NIGHT_WITCH: "女巫行動",
  DAY_ANNOUNCEMENT: "天亮公布",
  HUNTER_SHOOT: "獵人開槍",
  DAY_DISCUSSION: "白天討論",
  DAY_VOTE: "白天投票",
  DAY_TIEBREAK_DISCUSSION: "平票加賽發言",
  DAY_EXILE_RESULT: "放逐結果",
  DAY_LAST_WORDS: "遺言",
  GAME_OVER: "遊戲結束",
};

export const NIGHT_ACTION_PHASE_ORDER: GamePhase[] = [
  "NIGHT_GUARD",
  "NIGHT_WEREWOLF",
  "NIGHT_SEER",
  "NIGHT_WITCH",
];
