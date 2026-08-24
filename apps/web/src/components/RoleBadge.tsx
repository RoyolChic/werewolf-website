import { ROLE_LABELS, type Role } from "@kill-wolf/shared";

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role-badge role-badge-${role.toLowerCase()}`}>{ROLE_LABELS[role]}</span>;
}
