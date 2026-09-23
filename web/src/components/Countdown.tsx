import { useEffect, useState } from 'react';

export function Countdown({
  startedAt,
  timeLimitSec,
  onExpire,
}: {
  startedAt: number | null;
  timeLimitSec: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(timeLimitSec);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setExpired(false);
    if (!startedAt) return;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, Math.ceil(timeLimitSec - elapsed));
      setRemaining(left);
      if (left <= 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, timeLimitSec]);

  return <div className="countdown">{remaining}</div>;
}
