import type { GamePhase } from "../types/phase";

export const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: "等待房",
  CARD_PICKING: "選牌",
  ROLE_REVEAL: "確認角色",
  NIGHT_START: "夜晚降臨",
  NIGHT_WEREWOLF: "狼人行動",
  NIGHT_SEER: "預言家行動",
  NIGHT_WITCH: "女巫行動",
  DAY_ANNOUNCEMENT: "天亮公布",
  DAY_DISCUSSION: "白天討論",
  DAY_VOTE: "白天投票",
  DAY_EXILE_RESULT: "放逐結果",
  GAME_OVER: "遊戲結束",
};

export const NIGHT_ACTION_PHASE_ORDER: GamePhase[] = [
  "NIGHT_WEREWOLF",
  "NIGHT_SEER",
  "NIGHT_WITCH",
];
