import { useEffect, useState } from "react";

interface CountdownProps {
  /** Absolute epoch ms the countdown ends at; null while paused (falls back to a static display). */
  endsAt: number | null;
  /** Static seconds to show while paused or before endsAt is known. */
  fallbackSeconds: number | null;
}

function computeRemaining(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

export function Countdown({ endsAt, fallbackSeconds }: CountdownProps) {
  // Re-rendering every 250ms while a deadline is active is what makes the display actually tick;
  // the value itself isn't read anywhere, only the state change matters.
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  const secondsRemaining = endsAt !== null ? computeRemaining(endsAt) : fallbackSeconds;
  if (secondsRemaining === null) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="countdown">{minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}`}</div>
  );
}
