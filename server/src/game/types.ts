export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

interface QuestionBase {
  id: string;
  title: string;
  text: string;
  // Shown on players' phones instead of `text` when set; the host always shows `text`.
  playerText?: string;
  timeLimitSec: number;
  points: number;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: string[];
  correctIndex: number;
}

// Player drags a token onto a canvas once per guessed occurrence; there's no
// running counter shown to them, just the pile of tokens they've dropped.
export interface DragCountQuestion extends QuestionBase {
  type: 'drag_count';
  dragLabel: string;
  correctCount: number;
}

// Player sorts the avatars of each group onto a podium in finishing order.
export interface PodiumOrderQuestion extends QuestionBase {
  type: 'podium_order';
  // Avatar keys per group, first place first.
  correctOrder: string[][];
  groupLabels: string[];
}

// Player marks who had a primo/secondo course (or both, or neither) by
// dragging course tokens onto each seat's plate at a fixed table layout.
export interface PlateAssignmentQuestion extends QuestionBase {
  type: 'plate_assignment';
  head: string;
  left: string[];
  right: string[];
  correctPrimo: string[];
  correctSecondo: string[];
}

// Like multiple_choice, but any number of options can be correct. Scored
// per-option (was each checkbox left as the player set it, right or wrong).
export interface MultiSelectQuestion extends QuestionBase {
  type: 'multi_select';
  options: string[];
  correctIndexes: number[];
}

export interface Point {
  x: number;
  y: number;
}

// Player drags two control points to place a line that cuts the pictured
// object exactly in half by area. `rows` is a precomputed silhouette mask
// (see server/src/game/ham.ts) used only for server-side scoring -- never
// sent to clients.
export interface HamCutQuestion extends QuestionBase {
  type: 'ham_cut';
  imageUrl: string;
  rows: ([number, number] | null)[];
}

// Player draws freehand strokes over `imageUrl` trying to reproduce the marks
// visible in `revealImageUrl`. `marks` are the hand-traced true strokes (see
// server/src/game/bowie.ts), used only for server-side scoring.
export interface TraceMarksQuestion extends QuestionBase {
  type: 'trace_marks';
  imageUrl: string;
  revealImageUrl: string;
  aspectRatio: number;
  marks: Point[][];
}

export type Question =
  | MultipleChoiceQuestion
  | DragCountQuestion
  | PodiumOrderQuestion
  | PlateAssignmentQuestion
  | HamCutQuestion
  | MultiSelectQuestion
  | TraceMarksQuestion;

// Plain `Omit<Question, K>` doesn't distribute over the union and collapses
// to the shared shape, losing the type-specific fields -- this does.
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export interface PlayerAnswer {
  answeredAtMs: number;
  correct: boolean;
  pointsAwarded: number;
  // Meaning depends on the question type: option index for multiple_choice,
  // dragged-token count for drag_count, correct placements for podium_order.
  value: number;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
  answers: Record<string, PlayerAnswer>;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
}

// Only one of these ever exists at a time -- a single reunion, played once.
export interface Room {
  hostToken: string;
  status: RoomStatus;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  players: Record<string, Player>;
  createdAt: number;
}

export type HostQuestionView =
  | (Omit<MultipleChoiceQuestion, 'correctIndex'> & { correctIndex?: number })
  | (Omit<DragCountQuestion, 'correctCount'> & { correctCount?: number })
  | (Omit<PodiumOrderQuestion, 'correctOrder'> & { groups: string[][]; correctOrder?: string[][] })
  | (Omit<PlateAssignmentQuestion, 'correctPrimo' | 'correctSecondo'> & {
      correctPrimo?: string[];
      correctSecondo?: string[];
    })
  | Omit<HamCutQuestion, 'rows'>
  | (Omit<MultiSelectQuestion, 'correctIndexes'> & { correctIndexes?: number[] })
  | (Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'> & { revealImageUrl?: string });

export interface HostGuess {
  playerId: string;
  name: string;
  avatar: string;
  value: number;
  correct: boolean;
}

export interface HostRoomView {
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: HostQuestionView | null;
  answeredCount: number;
  // Only populated for multiple_choice questions.
  optionCounts: number[];
  // Only populated for drag_count and podium_order questions once revealed.
  guesses: HostGuess[];
  playerCount: number;
  players: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
}

export type PlayerQuestionView =
  | Omit<MultipleChoiceQuestion, 'correctIndex'>
  | Omit<DragCountQuestion, 'correctCount'>
  // Groups are sorted alphabetically so they don't leak the answer.
  | (Omit<PodiumOrderQuestion, 'correctOrder'> & { groups: string[][] })
  | Omit<PlateAssignmentQuestion, 'correctPrimo' | 'correctSecondo'>
  | Omit<HamCutQuestion, 'rows'>
  | Omit<MultiSelectQuestion, 'correctIndexes'>
  | Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'>;

export interface PlayerRoomView {
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: PlayerQuestionView | null;
  hasAnswered: boolean;
  lastResult: PlayerAnswer | null;
  // The correct option index, correct count or total placements, depending on question type.
  correctValue: number | null;
  score: number;
  rank: number;
  playerCount: number;
}
