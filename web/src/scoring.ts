// Mirrors scoreForAnswer in server/src/game/room.util.ts.
export function scoreForAnswer(points: number, timeLimitSec: number, elapsedMs: number): number {
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs));
  return Math.round(points * (1 - ratio * 0.5));
}
