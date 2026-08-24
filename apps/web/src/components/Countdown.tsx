export function Countdown({ secondsRemaining }: { secondsRemaining: number | null }) {
  if (secondsRemaining === null) return null;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return (
    <div className="countdown">
      {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}`}
    </div>
  );
}
