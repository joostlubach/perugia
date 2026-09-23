import { customAlphabet } from 'nanoid';
import { MenuCourse, Point } from './types';

const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const generateToken = customAlphabet(TOKEN_ALPHABET, 24);
// Short enough to type over from the big screen, long enough not to guess.
const generateJoinCode = customAlphabet(TOKEN_ALPHABET, 6);

export function newToken(): string {
  return generateToken();
}

export function newJoinCode(): string {
  return generateJoinCode();
}

export function scoreForAnswer(points: number, timeLimitSec: number, elapsedMs: number): number {
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs));
  // Full points for an instant answer, decaying to half points at the wire.
  return Math.round(points * (1 - ratio * 0.5));
}

export function countCorrectPlacements(order: string[][], correctOrder: string[][]): number {
  return correctOrder.reduce(
    (sum, group, g) => sum + group.filter((key, i) => order[g]?.[i] === key).length,
    0,
  );
}

// Counts people placed at their correct stop. Anyone placed at more than one
// stop only counts at the first.
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

export interface PlateAnswer {
  primo: string[];
  secondo: string[];
}

// Counts correct yes/no marks (had primo? had secondo?) across all seats --
// getting a "no" right (an empty plate, correctly guessed empty) counts too.
export function countCorrectPlateMarks(
  answer: PlateAnswer,
  correct: { correctPrimo: string[]; correctSecondo: string[] },
  seats: string[],
): number {
  return seats.reduce((sum, seat) => {
    const primoRight = answer.primo.includes(seat) === correct.correctPrimo.includes(seat);
    const secondoRight = answer.secondo.includes(seat) === correct.correctSecondo.includes(seat);
    return sum + (primoRight ? 1 : 0) + (secondoRight ? 1 : 0);
  }, 0);
}

// Counts correctly-set checkboxes across all options -- leaving a wrong
// option unchecked counts as correct too, same spirit as countCorrectPlateMarks.
export function countCorrectSelections(selected: number[], correctIndexes: number[], optionCount: number): number {
  let count = 0;
  for (let i = 0; i < optionCount; i++) {
    if (selected.includes(i) === correctIndexes.includes(i)) count++;
  }
  return count;
}

// Counts the courses where exactly one dish was ordered and it's the right one.
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

// Scores an estimate by how close it is: 100 when exact, falling linearly to
// 0 at half the correct amount off (or more), either way.
export function scoreEstimate(guess: number, correct: number): number {
  if (correct <= 0) return guess === correct ? 100 : 0;
  const error = Math.abs(guess - correct) / correct;
  return Math.round(Math.max(0, 1 - error * 2) * 100);
}

export interface HamLine {
  p1: Point;
  p2: Point;
}

// Scores how evenly a line splits the silhouette's area: 0 (all on one
// side) to 100 (a perfect 50/50 split). `rows` are precomputed [xMin, xMax]
// spans (or null) at evenly spaced heights across the image.
export function scoreHamCut(line: HamLine, rows: ([number, number] | null)[]): number {
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
  const ratio = Math.min(sideA, sideB) / total; // 0 (worst) to 0.5 (perfect)
  return Math.round(ratio * 200);
}

// Scores a freehand drawing against the true marks: 0 to 100. Recall is how
// much of the true marks the drawing covers, precision how much of the
// drawing lies on a true mark; the score is their harmonic mean. Drawing far
// more ink than the marks have is penalized, so scribbling over everything
// doesn't pay off. `aspectRatio` (width / height) corrects the normalized
// coordinates so distances are measured in image-height units both ways.
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
