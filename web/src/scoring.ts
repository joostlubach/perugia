import { MenuCourse, Point, SketchPlacement } from './types';

// Mirrors scoreForAnswer in server/src/game/room.util.ts.
export function scoreForAnswer(points: number, timeLimitSec: number, elapsedMs: number): number {
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs));
  return Math.round(points * (1 - ratio * 0.5));
}

// Mirrors countCorrectPlacements in server/src/game/room.util.ts.
export function countCorrectPlacements(order: string[][], correctOrder: string[][]): number {
  return correctOrder.reduce(
    (sum, group, g) => sum + group.filter((key, i) => order[g]?.[i] === key).length,
    0,
  );
}

// Mirrors countCorrectGroupings in server/src/game/room.util.ts.
export function countCorrectGroupings(groups: string[][], correctGroups: string[][]): number {
  const seen = new Set<string>();
  let count = 0;
  groups.forEach((group, g) => {
    for (const key of group) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (correctGroups[g]?.includes(key)) count++;
    }
  });
  return count;
}

export function totalPlacements(correctOrder: string[][]): number {
  return correctOrder.reduce((sum, group) => sum + group.length, 0);
}

// Mirrors countCorrectSelections in server/src/game/room.util.ts.
export function countCorrectSelections(selected: number[], correctIndexes: number[], optionCount: number): number {
  let count = 0;
  for (let i = 0; i < optionCount; i++) {
    if (selected.includes(i) === correctIndexes.includes(i)) count++;
  }
  return count;
}

// Mirrors isCorrectOption in server/src/game/room.util.ts.
export function isCorrectOption(correctIndex: number | number[], option: number): boolean {
  return Array.isArray(correctIndex) ? correctIndex.includes(option) : option === correctIndex;
}

// Mirrors countCorrectMenuPicks in server/src/game/room.util.ts.
export function countCorrectMenuPicks(selected: number[], menu: MenuCourse[], correctIndexes: number[]): number {
  let start = 0;
  let count = 0;
  for (const course of menu) {
    const end = start + course.dishes.length;
    const picks = selected.filter((i) => i >= start && i < end);
    if (picks.length === 1 && correctIndexes.includes(picks[0])) count++;
    start = end;
  }
  return count;
}

// Mirrors scoreCount in server/src/game/room.util.ts.
export function scoreCount(guess: number, correct: number, nearMisses: { maxOff: number; share: number }[] = []): number {
  if (guess === correct) return 1;
  const off = Math.abs(guess - correct);
  return nearMisses.find((band) => off <= band.maxOff)?.share ?? 0;
}

// Mirrors scoreEstimate in server/src/game/room.util.ts.
export function scoreEstimate(guess: number, correct: number): number {
  if (correct <= 0) return guess === correct ? 100 : 0;
  const error = Math.abs(guess - correct) / correct;
  return Math.round(Math.max(0, 1 - error * 2) * 100);
}

// Mirrors scoreSketch in server/src/game/room.util.ts.
export function scoreSketch(placements: SketchPlacement[], correct: SketchPlacement[], aspectRatio: number): number {
  if (correct.length === 0) return 0;
  let sum = 0;
  for (const target of correct) {
    const placed = placements.find((p) => p.id === target.id);
    if (!placed) continue;
    const distance = Math.hypot((placed.x - target.x) * aspectRatio, placed.y - target.y);
    sum += fade(distance, SKETCH_NEAR, SKETCH_FAR);
  }
  return Math.round((sum / correct.length) * 100);
}

function fade(value: number, near: number, far: number): number {
  return Math.max(0, Math.min(1, (far - value) / (far - near)));
}

// Mirrors mapDistanceKm in server/src/game/room.util.ts.
export function mapDistanceKm(guess: Point, answer: Point, aspectRatio: number, mapWidthKm: number): number {
  return Math.hypot(guess.x - answer.x, (guess.y - answer.y) / aspectRatio) * mapWidthKm;
}

// Mirrors scoreDistance in server/src/game/room.util.ts.
export function scoreDistance(km: number, fullPointsKm: number, zeroPointsKm: number): number {
  return fade(km, fullPointsKm, zeroPointsKm);
}

const SKETCH_NEAR = 0.03;
const SKETCH_FAR = 0.15;

// Mirrors scoreHamCut in server/src/game/room.util.ts.
export function scoreHamCut(
  line: { p1: { x: number; y: number }; p2: { x: number; y: number } },
  rows: ([number, number] | null)[],
): number {
  const { p1, p2 } = line;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const n = rows.length;
  let sideA = 0;
  let sideB = 0;

  for (let i = 0; i < n; i++) {
    const row = rows[i];
    if (!row) continue;
    const [xMin, xMax] = row;
    const width = xMax - xMin;
    if (width <= 0) continue;
    const y = (i + 0.5) / n;

    let fracA: number;
    if (Math.abs(dy) < 1e-9) {
      fracA = y < (p1.y + p2.y) / 2 ? 1 : 0;
    } else {
      const xCross = p1.x + ((y - p1.y) / dy) * dx;
      const clamped = Math.max(xMin, Math.min(xMax, xCross));
      fracA = (clamped - xMin) / width;
    }
    sideA += fracA * width;
    sideB += (1 - fracA) * width;
  }

  const total = sideA + sideB;
  if (total <= 0) return 0;
  const ratio = Math.min(sideA, sideB) / total;
  return Math.round(ratio * 200);
}

// Mirrors scoreTraceMarks in server/src/game/room.util.ts.
export function scoreTraceMarks(strokes: Point[][], marks: Point[][], aspectRatio: number): number {
  const drawn = resampleStrokes(strokes, aspectRatio);
  const target = resampleStrokes(marks, aspectRatio);
  if (drawn.length === 0 || target.length === 0) return 0;

  const recall = averageCloseness(target, drawn);
  const lengthPenalty = Math.min(1, (TRACE_MAX_INK_RATIO * target.length) / drawn.length);
  const precision = averageCloseness(drawn, target) * lengthPenalty;
  if (recall + precision === 0) return 0;
  return Math.round((200 * precision * recall) / (precision + recall));
}

const TRACE_STEP = 0.005;
const TRACE_NEAR = 0.015;
const TRACE_FAR = 0.05;
const TRACE_MAX_INK_RATIO = 1.5;

// Points spaced TRACE_STEP apart along every stroke, so scores depend on ink
// length rather than on how many pointer events a stroke happened to have.
function resampleStrokes(strokes: Point[][], aspectRatio: number): Point[] {
  const out: Point[] = [];
  for (const stroke of strokes) {
    const pts = stroke.map((p) => ({ x: p.x * aspectRatio, y: p.y }));
    if (pts.length === 0) continue;
    out.push(pts[0]);
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      let t = TRACE_STEP - carry;
      while (t <= len) {
        out.push({ x: a.x + ((b.x - a.x) * t) / len, y: a.y + ((b.y - a.y) * t) / len });
        t += TRACE_STEP;
      }
      carry = len - (t - TRACE_STEP);
    }
  }
  return out;
}

// 1 within TRACE_NEAR of the nearest `to` point, fading to 0 at TRACE_FAR.
function averageCloseness(from: Point[], to: Point[]): number {
  let sum = 0;
  for (const p of from) {
    let best = Infinity;
    for (const q of to) {
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (d < best) best = d;
    }
    const dist = Math.sqrt(best);
    sum += Math.max(0, Math.min(1, (TRACE_FAR - dist) / (TRACE_FAR - TRACE_NEAR)));
  }
  return sum / from.length;
}
