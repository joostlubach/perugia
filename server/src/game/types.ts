export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

interface QuestionBase {
  id: string;
  text: string;
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

export type Question = MultipleChoiceQuestion | DragCountQuestion;

// Plain `Omit<Question, K>` doesn't distribute over the union and collapses
// to the shared shape, losing the type-specific fields -- this does.
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export interface PlayerAnswer {
  answeredAtMs: number;
  correct: boolean;
  pointsAwarded: number;
  // Meaning depends on the question type: option index for multiple_choice,
  // dragged-token count for drag_count.
  value: number;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  score: number;
  joinedAt: number;
  answers: Record<string, PlayerAnswer>;
}

export interface Room {
  code: string;
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
  | (Omit<DragCountQuestion, 'correctCount'> & { correctCount?: number });

export interface HostGuess {
  playerId: string;
  name: string;
  value: number;
  correct: boolean;
}

export interface HostRoomView {
  code: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: HostQuestionView | null;
  answeredCount: number;
  // Only populated for multiple_choice questions.
  optionCounts: number[];
  // Only populated for drag_count questions once revealed.
  guesses: HostGuess[];
  playerCount: number;
  players: { id: string; name: string; score: number }[];
  leaderboard: { id: string; name: string; score: number }[];
}

export type PlayerQuestionView =
  | Omit<MultipleChoiceQuestion, 'correctIndex'>
  | Omit<DragCountQuestion, 'correctCount'>;

export interface PlayerRoomView {
  code: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: PlayerQuestionView | null;
  hasAnswered: boolean;
  lastResult: PlayerAnswer | null;
  // The correct option index or correct count, depending on question type.
  correctValue: number | null;
  score: number;
  rank: number;
  playerCount: number;
}
