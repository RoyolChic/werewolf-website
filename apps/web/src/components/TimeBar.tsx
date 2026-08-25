import { useEffect, useState } from "react";

interface TimeBarProps {
  /** Absolute epoch ms the countdown ends at; null while paused or not running. */
  endsAt: number | null;
  totalSeconds: number;
}

function computeRemainingMs(endsAt: number): number {
  return Math.max(0, endsAt - Date.now());
}

export function TimeBar({ endsAt, totalSeconds }: TimeBarProps) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (endsAt === null) return null;

  const remainingMs = computeRemainingMs(endsAt);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const percent = Math.max(0, Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100));
  const isUrgent = remainingSeconds <= 10;

  return (
    <div className={`time-bar ${isUrgent ? "time-bar-urgent" : ""}`}>
      <div className="time-bar-track">
        <div className="time-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="time-bar-label">{remainingSeconds} 秒</span>
    </div>
  );
}
