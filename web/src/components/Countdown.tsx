import { useEffect, useRef, useState } from 'react';

export function Countdown({
  startedAt,
  timeLimitSec,
  onExpire,
  floating,
}: {
  startedAt: number | null;
  timeLimitSec: number;
  onExpire?: () => void;
  // Pinned to the top-left corner so it stays visible while scrolling (phones).
  floating?: boolean;
}) {
  const remaining = useCountdown(startedAt, timeLimitSec, onExpire);
  return <div className={`countdown ${floating ? 'floating' : ''} ${remaining <= 5 ? 'urgent' : ''}`}>{remaining}</div>;
}

// Seconds left, calling `onExpire` once when it hits zero. Boards use this to
// auto-submit without drawing a timer of their own.
export function useCountdown(startedAt: number | null, timeLimitSec: number, onExpire?: () => void): number {
  const [remaining, setRemaining] = useState(timeLimitSec);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!startedAt) return;
    let expired = false;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, Math.ceil(timeLimitSec - elapsed));
      setRemaining(left);
      if (left <= 0 && !expired) {
        expired = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startedAt, timeLimitSec]);

  return remaining;
}
