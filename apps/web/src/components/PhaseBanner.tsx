import { PHASE_LABELS, type GamePhase } from "@kill-wolf/shared";

export function PhaseBanner({ phase, dayNumber, nightNumber }: { phase: GamePhase; dayNumber: number; nightNumber: number }) {
  const countLabel = phase.startsWith("NIGHT") ? `第 ${nightNumber} 夜` : phase.startsWith("DAY") ? `第 ${dayNumber} 天` : "";
  return (
    <div className="phase-banner">
      <span className="phase-banner-label">{PHASE_LABELS[phase]}</span>
      {countLabel && <span className="phase-banner-count">{countLabel}</span>}
    </div>
  );
}
