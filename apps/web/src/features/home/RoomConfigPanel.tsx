import {
  DAY_DISCUSSION_SECONDS_DEFAULT,
  DAY_DISCUSSION_SECONDS_MAX,
  DAY_DISCUSSION_SECONDS_MIN,
  ROLE_COUNTS_BY_PLAYER_COUNT,
  ROLE_LABELS,
  type WitchSelfSaveRule,
} from "@kill-wolf/shared";

export interface RoomConfigValue {
  maxPlayers: number;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
}

interface RoomConfigPanelProps {
  value: RoomConfigValue;
  onChange: (value: RoomConfigValue) => void;
}

export function RoomConfigPanel({ value, onChange }: RoomConfigPanelProps) {
  const roleCounts = ROLE_COUNTS_BY_PLAYER_COUNT[value.maxPlayers];

  return (
    <div className="room-config-panel">
      <label className="field">
        <span>遊玩人數</span>
        <select
          value={value.maxPlayers}
          onChange={(e) => onChange({ ...value, maxPlayers: Number(e.target.value) })}
        >
          {Object.keys(ROLE_COUNTS_BY_PLAYER_COUNT).map((count) => (
            <option key={count} value={count}>
              {count} 人
            </option>
          ))}
        </select>
      </label>

      <div className="role-config-summary">
        {(Object.entries(roleCounts) as [keyof typeof roleCounts, number][])
          .filter(([, count]) => count > 0)
          .map(([role, count]) => (
            <span key={role} className="role-config-item">
              {ROLE_LABELS[role]} x{count}
            </span>
          ))}
      </div>

      <label className="field">
        <span>白天發言秒數（{value.dayDiscussionSeconds} 秒）</span>
        <input
          type="range"
          min={DAY_DISCUSSION_SECONDS_MIN}
          max={DAY_DISCUSSION_SECONDS_MAX}
          step={10}
          value={value.dayDiscussionSeconds}
          onChange={(e) => onChange({ ...value, dayDiscussionSeconds: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>女巫自救規則</span>
        <select
          value={value.witchSelfSaveRule}
          onChange={(e) => onChange({ ...value, witchSelfSaveRule: e.target.value as WitchSelfSaveRule })}
        >
          <option value="FIRST_NIGHT_ONLY">只能第一晚自救</option>
          <option value="ANYTIME">隨時可以自救</option>
        </select>
      </label>

      <div className="rules-explainer">
        <h3>勝利條件</h3>
        <p>狼人勝利：狼人數量大於或等於好人數量。</p>
        <p>好人勝利：所有狼人死亡。</p>
        <h3>女巫技能</h3>
        <p>解藥可救當晚被狼人擊殺的玩家，毒藥可毒死一名玩家，兩者皆只能使用一次，且同一晚不能同時使用。</p>
      </div>
    </div>
  );
}

export const DEFAULT_ROOM_CONFIG_VALUE: RoomConfigValue = {
  maxPlayers: 6,
  dayDiscussionSeconds: DAY_DISCUSSION_SECONDS_DEFAULT,
  witchSelfSaveRule: "FIRST_NIGHT_ONLY",
};
