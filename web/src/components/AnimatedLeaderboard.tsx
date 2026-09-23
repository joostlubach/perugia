import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';

// Shows the previous standings for a moment, then slides everyone to their
// new place while their scores count up to the new totals.
export function AnimatedLeaderboard({
  previous,
  current,
  limit,
}: {
  previous: LeaderboardEntry[];
  current: LeaderboardEntry[];
  limit: number;
}) {
  const [moved, setMoved] = useState(false);
  const progress = useProgress(moved, MOVE_MS);

  useEffect(() => {
    const id = setTimeout(() => setMoved(true), HOLD_MS);
    return () => clearTimeout(id);
  }, []);

  const shown = current.slice(0, limit);
  const previousIndex = new Map(previous.map((entry, i) => [entry.id, i]));
  const previousScore = new Map(previous.map((entry) => [entry.id, entry.score]));

  return (
    <ol className="leaderboard-list animated" style={{ height: shown.length * ROW_HEIGHT }}>
      {shown.map((entry, newIndex) => {
        const oldIndex = previousIndex.get(entry.id) ?? previous.length;
        // Climbers from outside the shown list fade in from just below it.
        const index = moved ? newIndex : Math.min(oldIndex, limit);
        const from = previousScore.get(entry.id) ?? 0;
        const score = Math.round(from + (entry.score - from) * progress);
        return (
          <li
            key={entry.id}
            className={index === 0 ? 'leader' : ''}
            style={{ transform: `translateY(${index * ROW_HEIGHT}px)`, opacity: index >= limit ? 0 : 1 }}
          >
            <span>
              #{(moved ? newIndex : oldIndex) + 1} {entry.name}
            </span>
            <span>{score}</span>
          </li>
        );
      })}
    </ol>
  );
}

const HOLD_MS = 1500;
const MOVE_MS = 1600;
// Must match the row height + gap in .leaderboard-list.animated.
const ROW_HEIGHT = 54;

// Eases from 0 to 1 over `durationMs` once `running` turns true.
function useProgress(running: boolean, durationMs: number): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, durationMs]);

  return progress;
}
