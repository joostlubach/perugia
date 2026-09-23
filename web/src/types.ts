export type RoomStatus = 'lobby' | 'intro' | 'question' | 'reveal' | 'leaderboard' | 'ended';

export interface MultipleChoiceInput {
  type: 'multiple_choice';
  title: string;
  text: string;
  options: string[];
  correctIndex: number;
  imageUrl?: string;
  timeLimitSec: number;
  points: number;
}

// Order one dish per course. Dishes are indexed across all courses in order;
// `correctIndexes` holds the right dish of each course.
export interface MenuOrderInput {
  type: 'menu_order';
  title: string;
  text: string;
  playerText?: string;
  menu: MenuCourse[];
  correctIndexes: number[];
  timeLimitSec: number;
  points: number;
}

export interface MenuCourse {
  course: string;
  dishes: { name: string; description?: string }[];
}

export interface DragCountInput {
  type: 'drag_count';
  title: string;
  text: string;
  dragLabel: string;
  correctCount: number;
  // Within `maxOff` of the right count earns `share` (0-1) of the points.
  nearMisses?: { maxOff: number; share: number }[];
  timeLimitSec: number;
  points: number;
}

export interface PodiumOrderInput {
  type: 'podium_order';
  title: string;
  text: string;
  // Avatar keys per group, first place first.
  correctOrder: string[][];
  groupLabels: string[];
  timeLimitSec: number;
  points: number;
}

export interface PlateAssignmentInput {
  type: 'plate_assignment';
  title: string;
  text: string;
  head: string;
  left: string[];
  right: string[];
  correctPrimo: string[];
  correctSecondo: string[];
  timeLimitSec: number;
  points: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface HamCutInput {
  type: 'ham_cut';
  title: string;
  text: string;
  imageUrl: string;
  rows: ([number, number] | null)[];
  timeLimitSec: number;
  points: number;
}

export interface MultiSelectInput {
  type: 'multi_select';
  title: string;
  text: string;
  options: string[];
  correctIndexes: number[];
  timeLimitSec: number;
  points: number;
}

export interface TraceMarksInput {
  type: 'trace_marks';
  title: string;
  text: string;
  playerText?: string;
  imageUrl: string;
  revealImageUrl: string;
  aspectRatio: number;
  marks: Point[][];
  timeLimitSec: number;
  points: number;
}

// A spot on a map image, in fractions of its width/height from the top left.
export interface MapPin {
  label: string;
  icon: string;
  x: number;
  y: number;
  side?: 'left' | 'right';
}

export interface TravelMapInput {
  type: 'travel_map';
  title: string;
  text: string;
  playerText?: string;
  mapUrl: string;
  aspectRatio: number;
  landmarks: MapPin[];
  stops: MapPin[];
  // Avatar keys per stop, in the same order as `stops`.
  correctGroups: string[][];
  timeLimitSec: number;
  points: number;
}

// Estimation: drag bills and coins into a vase. Amounts in euro cents.
export interface MoneyVaseInput {
  type: 'money_vase';
  title: string;
  text: string;
  playerText?: string;
  denominations: number[];
  correctCents: number;
  timeLimitSec: number;
  points: number;
}

export type QuestionInput =
  | MultipleChoiceInput
  | MoneyVaseInput
  | TravelMapInput
  | DragCountInput
  | PodiumOrderInput
  | PlateAssignmentInput
  | HamCutInput
  | MultiSelectInput
  | MenuOrderInput
  | TraceMarksInput;

export interface PlateAnswer {
  primo: string[];
  secondo: string[];
}

export interface HamLine {
  p1: Point;
  p2: Point;
}

export interface MultiSelectAnswer {
  selected: number[];
}

export interface TraceAnswer {
  strokes: Point[][];
}

export type HostQuestionView =
  | {
      id: string;
      type: 'multiple_choice';
      title: string;
      text: string;
      options: string[];
      imageUrl?: string;
      timeLimitSec: number;
      points: number;
      correctIndex?: number;
    }
  | {
      id: string;
      type: 'menu_order';
      title: string;
      text: string;
      menu: MenuCourse[];
      timeLimitSec: number;
      points: number;
      correctIndexes?: number[];
    }
  | {
      id: string;
      type: 'drag_count';
      title: string;
      text: string;
      dragLabel: string;
      timeLimitSec: number;
      points: number;
      correctCount?: number;
    }
  | {
      id: string;
      type: 'podium_order';
      title: string;
      text: string;
      groups: string[][];
      groupLabels: string[];
      timeLimitSec: number;
      points: number;
      correctOrder?: string[][];
    }
  | {
      id: string;
      type: 'plate_assignment';
      title: string;
      text: string;
      head: string;
      left: string[];
      right: string[];
      timeLimitSec: number;
      points: number;
      correctPrimo?: string[];
      correctSecondo?: string[];
    }
  | {
      id: string;
      type: 'ham_cut';
      title: string;
      text: string;
      imageUrl: string;
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'multi_select';
      title: string;
      text: string;
      options: string[];
      timeLimitSec: number;
      points: number;
      correctIndexes?: number[];
    }
  | {
      id: string;
      type: 'trace_marks';
      title: string;
      text: string;
      imageUrl: string;
      aspectRatio: number;
      timeLimitSec: number;
      points: number;
      revealImageUrl?: string;
    }
  | {
      id: string;
      type: 'travel_map';
      title: string;
      text: string;
      mapUrl: string;
      aspectRatio: number;
      landmarks: MapPin[];
      stops: MapPin[];
      people: string[];
      timeLimitSec: number;
      points: number;
      correctGroups?: string[][];
    }
  | {
      id: string;
      type: 'money_vase';
      title: string;
      text: string;
      denominations: number[];
      timeLimitSec: number;
      points: number;
      correctCents?: number;
    };

export interface HostGuess {
  playerId: string;
  name: string;
  avatar: string;
  value: number;
  correct: boolean;
}

export type ReactionKind = 'mammamia' | 'mario' | 'losing' | 'gibberish' | 'congratulations' | 'letsgo';

export interface Reaction {
  id: string;
  playerId: string;
  name: string;
  avatar: string;
  kind: ReactionKind;
  at: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
}

export interface HostRoomView {
  status: RoomStatus;
  joinCode: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: HostQuestionView | null;
  answeredCount: number;
  optionCounts: number[];
  guesses: HostGuess[];
  afterReveal: 'leaderboard' | 'intro' | 'ended';
  playerCount: number;
  players: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  reactions: Reaction[];
}

export type PlayerQuestionView =
  | {
      id: string;
      type: 'multiple_choice';
      title: string;
      text: string;
      options: string[];
      imageUrl?: string;
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'menu_order';
      title: string;
      text: string;
      menu: MenuCourse[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'drag_count';
      title: string;
      text: string;
      dragLabel: string;
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'podium_order';
      title: string;
      text: string;
      groups: string[][];
      groupLabels: string[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'plate_assignment';
      title: string;
      text: string;
      head: string;
      left: string[];
      right: string[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'ham_cut';
      title: string;
      text: string;
      imageUrl: string;
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'multi_select';
      title: string;
      text: string;
      options: string[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'trace_marks';
      title: string;
      text: string;
      imageUrl: string;
      aspectRatio: number;
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'travel_map';
      title: string;
      text: string;
      mapUrl: string;
      aspectRatio: number;
      landmarks: MapPin[];
      stops: MapPin[];
      people: string[];
      timeLimitSec: number;
      points: number;
    }
  | {
      id: string;
      type: 'money_vase';
      title: string;
      text: string;
      denominations: number[];
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
