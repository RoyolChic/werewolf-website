import { useState } from "react";
import { getRoleImagePath, ROLE_RULES, type Role } from "@kill-wolf/shared";
import { RoleBadge } from "./RoleBadge";

export function RoleInfoPanel({ role, variantIndex = 0 }: { role: Role; variantIndex?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const rule = ROLE_RULES[role];

  return (
    <div className="role-info-panel">
      {!imageFailed && (
        <img
          className="role-info-image"
          src={getRoleImagePath(role, variantIndex)}
          alt=""
          onError={() => setImageFailed(true)}
        />
      )}
      <RoleBadge role={role} />
      <p className="role-info-summary">{rule.summary}</p>
      {rule.night && (
        <p>
          <strong>晚上：</strong>
          {rule.night}
        </p>
      )}
      <p>
        <strong>白天：</strong>
        {rule.day}
      </p>
      <p>
        <strong>勝利條件：</strong>
        {rule.goal}
      </p>
    </div>
  );
}
