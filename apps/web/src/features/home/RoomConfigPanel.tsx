import {
  DAY_DISCUSSION_SECONDS_DEFAULT,
  DAY_DISCUSSION_SECONDS_MAX,
  DAY_DISCUSSION_SECONDS_MIN,
  getRoleCountsForPlayerCount,
  maxOptionalRolesForPlayerCount,
  OPTIONAL_ROLES,
  ROLE_LABELS,
  ROLE_RULES,
  SUPPORTED_PLAYER_COUNTS,
  type OptionalRole,
  type Role,
  type WitchSelfSaveRule,
} from "@kill-wolf/shared";

export interface RoomConfigValue {
  maxPlayers: number;
  dayDiscussionSeconds: number;
  witchSelfSaveRule: WitchSelfSaveRule;
  optionalRoles: OptionalRole[];
}

interface RoomConfigPanelProps {
  value: RoomConfigValue;
  onChange: (value: RoomConfigValue) => void;
}

export function RoomConfigPanel({ value, onChange }: RoomConfigPanelProps) {
  const roleCounts = getRoleCountsForPlayerCount(value.maxPlayers, value.optionalRoles);
  const maxOptionalRoles = maxOptionalRolesForPlayerCount(value.maxPlayers);

  function toggleOptionalRole(role: OptionalRole) {
    const isSelected = value.optionalRoles.includes(role);
    if (!isSelected && value.optionalRoles.length >= maxOptionalRoles) {
      return;
    }
    const optionalRoles = isSelected
      ? value.optionalRoles.filter((r) => r !== role)
      : [...value.optionalRoles, role];
    onChange({ ...value, optionalRoles });
  }

  return (
    <div className="room-config-panel">
      <label className="field">
        <span>遊玩人數</span>
        <select
          value={value.maxPlayers}
          onChange={(e) => {
            const maxPlayers = Number(e.target.value);
            const optionalRoles = value.optionalRoles.slice(0, maxOptionalRolesForPlayerCount(maxPlayers));
            onChange({ ...value, maxPlayers, optionalRoles });
          }}
        >
          {SUPPORTED_PLAYER_COUNTS.map((count) => (
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

      <div className="field">
        <span>
          特殊角色（最多可加 {maxOptionalRoles} 個，會替換掉平民名額）
        </span>
        <div className="optional-role-toggles">
          {OPTIONAL_ROLES.map((role) => {
            const checked = value.optionalRoles.includes(role);
            const disabled = !checked && value.optionalRoles.length >= maxOptionalRoles;
            return (
              <label key={role} className={`optional-role-toggle ${disabled ? "optional-role-toggle-disabled" : ""}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleOptionalRole(role)} />
                <span>{ROLE_LABELS[role]}</span>
              </label>
            );
          })}
        </div>
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
        <h3>角色技能</h3>
        {/* Pulled straight from ROLE_RULES (the same source the home page's role-intro section
            uses) so this always reflects whichever roles are actually in the current config,
            instead of a hand-maintained copy that can drift out of sync with it. */}
        {(Object.entries(roleCounts) as [Role, number][])
          .filter(([, count]) => count > 0)
          .map(([role]) => (
            <p key={role}>
              <strong>{ROLE_LABELS[role]}：</strong>
              {ROLE_RULES[role].summary}
            </p>
          ))}
      </div>
    </div>
  );
}

export const DEFAULT_ROOM_CONFIG_VALUE: RoomConfigValue = {
  maxPlayers: 6,
  dayDiscussionSeconds: DAY_DISCUSSION_SECONDS_DEFAULT,
  witchSelfSaveRule: "FIRST_NIGHT_ONLY",
  optionalRoles: [],
};
