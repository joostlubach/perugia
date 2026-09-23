export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

export interface MultipleChoiceInput {
  type: 'multiple_choice';
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
  points: number;
}

export interface DragCountInput {
  type: 'drag_count';
  text: string;
  dragLabel: string;
  correctCount: number;
  timeLimitSec: number;
  points: number;
}

export type QuestionInput = MultipleChoiceInput | DragCountInput;

export type HostQuestionView =
  | {
      id: string;
      type: 'multiple_choice';
      text: string;
      options: string[];
      timeLimitSec: number;
      points: number;
      correctIndex?: number;
    }
  | {
      id: string;
      type: 'drag_count';
      text: string;
      dragLabel: string;
      timeLimitSec: number;
      points: number;
      correctCount?: number;
    };

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
  optionCounts: number[];
  guesses: HostGuess[];
  playerCount: number;
  players: { id: string; name: string; score: number }[];
  leaderboard: { id: string; name: string; score: number }[];
}

export type PlayerQuestionView =
  | {
      id: string;
      type: 'multiple_choice';
      text: string;
      options: string[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'drag_count';
      text: string;
      dragLabel: string;
      timeLimitSec: number;
      points: number;
    };

export interface PlayerLastResult {
  value: number;
  answeredAtMs: number;
  correct: boolean;
  pointsAwarded: number;
}

export interface PlayerRoomView {
  code: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: PlayerQuestionView | null;
  hasAnswered: boolean;
  lastResult: PlayerLastResult | null;
  correctValue: number | null;
  score: number;
  rank: number;
  playerCount: number;
}
