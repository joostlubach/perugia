import { useEffect, useState } from 'react';

// Which photo of a lightning round is showing: one every `photoTimeSec`
// from `startedAt`, staying on the last one once they've all been shown.
export function usePhotoIndex(startedAt: number | null, photoTimeSec: number, count: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setIndex(Math.max(0, Math.min(count - 1, Math.floor(elapsed / photoTimeSec))));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, photoTimeSec, count]);

  return index;
}
