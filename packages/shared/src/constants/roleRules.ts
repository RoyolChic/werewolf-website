import type { Role } from "../types/role";

export interface RoleRule {
  summary: string;
  night: string | null;
  day: string;
  goal: string;
}

export const ROLE_RULES: Record<Role, RoleRule> = {
  WEREWOLF: {
    summary: "狼人陣營。每晚可以和其他狼人一起睜眼，互相討論並選出一位玩家擊殺。",
    night: "天黑後與其他狼人一起睜眼，共同選擇一位玩家殺害。全體狼人確認目標後才會真正下手。",
    day: "偽裝成好人參與討論與投票，避免被其他玩家識破身份。",
    goal: "殺光所有好人，或讓存活狼人數量大於或等於好人數量即獲勝。",
  },
  SEER: {
    summary: "好人陣營神職。每晚可以查驗一位玩家的真實陣營。",
    night:
      "天黑後睜眼，選擇一位存活玩家查驗，會得知對方是「好人陣營」還是「狼人陣營」；每晚只能查驗一人，查驗結果只有你自己知道，且會保留在查驗紀錄中供之後回顧。",
    day: "利用查驗結果，透過發言引導好人陣營找出狼人並投票放逐；小心過早暴露身分會被狼人針對擊殺。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
  WITCH: {
    summary: "好人陣營神職。擁有解藥與毒藥各一瓶，兩者皆只能使用一次。",
    night: "天黑後睜眼，會得知當晚被狼人殺害的目標，可選擇使用解藥救人，或使用毒藥毒殺任一玩家；解藥與毒藥同一晚不能同時使用。",
    day: "與其他好人一起討論、投票，找出狼人。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
  HUNTER: {
    summary: "好人陣營神職。死亡時可以開槍帶走一名玩家，但被女巫毒死時無法開槍。",
    night: "沒有夜晚行動，天黑請閉眼安心休息即可。",
    day: "與其他好人一起討論、投票，找出狼人。死亡時（除了被毒死）可以選擇開槍殺死任何一名玩家，也可以選擇不開槍。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
  GUARD: {
    summary: "好人陣營神職。每晚可以守護一名玩家，使其免於當晚被狼人擊殺。",
    night: "天黑後睜眼，選擇一名玩家守護；不能連續兩晚守護同一人。若守護的對象剛好也被女巫救，該玩家仍會死亡（同守同救）。",
    day: "與其他好人一起討論、投票，找出狼人。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
  KNIGHT: {
    summary: "好人陣營神職。白天可以公開身分並與一名玩家決鬥，整場遊戲限用一次。",
    night: "沒有夜晚行動，天黑請閉眼安心休息即可。",
    day: "可以隨時公開身分並選擇一名玩家決鬥：若對方是狼人，直接擊殺對方；若對方是好人，騎士自己以死謝罪。決鬥後當天直接進入夜晚，整場遊戲只能使用一次。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
  VILLAGER: {
    summary: "好人陣營平民，沒有任何主動技能。",
    night: "沒有夜晚行動，天黑請閉眼安心休息即可。",
    day: "透過觀察發言與投票，協助找出並放逐狼人。",
    goal: "協助好人陣營殺光所有狼人即獲勝。",
  },
};

/**
 * Werewolf and villager slots can outnumber 1 per game, so each has several card-art variants;
 * seer and witch only ever have one player, so a single-entry list is enough for them too.
 * Room configs top out at 4 werewolves and 6 villagers -- variants beyond what's drawn just
 * rotate (see getRoleImagePath) rather than requiring art for every possible seat count.
 */
export const ROLE_IMAGE_VARIANTS: Record<Role, string[]> = {
  WEREWOLF: ["/roles/werewolf1.png", "/roles/werewolf2.png", "/roles/werewolf3.png", "/roles/werewolf4.png"],
  SEER: ["/roles/seer.png"],
  WITCH: ["/roles/witch.png"],
  HUNTER: ["/roles/hunter.png"],
  GUARD: ["/roles/guide.png"],
  KNIGHT: ["/roles/knight.png"],
  VILLAGER: ["/roles/villager1.png", "/roles/villager2.png", "/roles/villager3.png", "/roles/villager4.png"],
};

export const CARD_BACK_IMAGE_PATH = "/roles/card-back.png";

export function getRoleImagePath(role: Role, variantIndex: number): string {
  const variants = ROLE_IMAGE_VARIANTS[role];
  return variants[variantIndex % variants.length];
}
