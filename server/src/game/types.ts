// `intro` shows the question on the big screen while the host reads it out;
// answering only opens in `question`.
export type RoomStatus = 'lobby' | 'intro' | 'question' | 'reveal' | 'leaderboard' | 'ended';

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
  // Optional photo shown above the options.
  imageUrl?: string;
}

// Player orders one dish per course from a restaurant menu card. Dishes are
// indexed across all courses in order; `correctIndexes` holds the right dish
// of each course. Scored per course.
export interface MenuOrderQuestion extends QuestionBase {
  type: 'menu_order';
  menu: MenuCourse[];
  correctIndexes: number[];
}

export interface MenuCourse {
  course: string;
  dishes: MenuDish[];
}

export interface MenuDish {
  name: string;
  description?: string;
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

// A spot on a map image, in fractions of its width/height from the top left.
export interface MapPin {
  label: string;
  icon: string;
  x: number;
  y: number;
  // Which side of the pin its label (and, for stops, the dropped avatars) goes.
  side?: 'left' | 'right';
}

// Player drags each person's avatar onto the map stop where they were.
// Scored per person placed at the right stop.
export interface TravelMapQuestion extends QuestionBase {
  type: 'travel_map';
  mapUrl: string;
  // Map width / height.
  aspectRatio: number;
  // Decorative pins (start and destination), not drop targets.
  landmarks: MapPin[];
  stops: MapPin[];
  // Avatar keys per stop, in the same order as `stops`.
  correctGroups: string[][];
}

// Estimation: player drags bills and coins into a vase, which shows the
// running total. Nothing comes back out. Amounts are in euro cents.
export interface MoneyVaseQuestion extends QuestionBase {
  type: 'money_vase';
  // Values of the bills and coins the player can drag, largest first.
  denominations: number[];
  correctCents: number;
}

export type Question =
  | MultipleChoiceQuestion
  | MoneyVaseQuestion
  | TravelMapQuestion
  | DragCountQuestion
  | PodiumOrderQuestion
  | PlateAssignmentQuestion
  | HamCutQuestion
  | MultiSelectQuestion
  | MenuOrderQuestion
  | TraceMarksQuestion;

// Plain `Omit<Question, K>` doesn't distribute over the union and collapses
// to the shared shape, losing the type-specific fields -- this does.
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export interface PlayerAnswer {
  answeredAtMs: number;
  correct: boolean;
  pointsAwarded: number;
  // Meaning depends on the question type: option index for multiple_choice,
  // dragged-token count for drag_count, correct placements for podium_order,
  // guessed amount in cents for money_vase.
  value: number;
  // The dish indexes ordered -- menu_order only.
  selection?: number[];
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

export const REACTION_KINDS = ['mammamia', 'mario', 'losing', 'gibberish', 'congratulations', 'letsgo'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

// A player's reaction, shown and heard on the big screen for a moment.
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

// Only one of these ever exists at a time -- a single reunion, played once.
export interface Room {
  hostToken: string;
  // Part of the join URL behind the lobby's QR code; nobody can join without it.
  joinCode: string;
  status: RoomStatus;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  // When the last player answered the current question.
  allAnsweredAt: number | null;
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
  | (Omit<MenuOrderQuestion, 'correctIndexes'> & { correctIndexes?: number[] })
  | (Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'> & { revealImageUrl?: string })
  | (Omit<TravelMapQuestion, 'correctGroups'> & { people: string[]; correctGroups?: string[][] })
  | (Omit<MoneyVaseQuestion, 'correctCents'> & { correctCents?: number });

export interface HostGuess {
  playerId: string;
  name: string;
  avatar: string;
  value: number;
  correct: boolean;
}

export interface HostRoomView {
  status: RoomStatus;
  joinCode: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: HostQuestionView | null;
  answeredCount: number;
  // Only populated for multiple_choice and menu_order questions.
  optionCounts: number[];
  // Only populated for drag_count and podium_order questions once revealed.
  guesses: HostGuess[];
  // Where advancing from the reveal goes.
  afterReveal: 'leaderboard' | 'intro' | 'ended';
  playerCount: number;
  players: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  // Reactions from the last few seconds, oldest first.
  reactions: Reaction[];
}

export type PlayerQuestionView =
  | Omit<MultipleChoiceQuestion, 'correctIndex'>
  | Omit<DragCountQuestion, 'correctCount'>
  // Groups are sorted alphabetically so they don't leak the answer.
  | (Omit<PodiumOrderQuestion, 'correctOrder'> & { groups: string[][] })
  | Omit<PlateAssignmentQuestion, 'correctPrimo' | 'correctSecondo'>
  | Omit<HamCutQuestion, 'rows'>
  | Omit<MultiSelectQuestion, 'correctIndexes'>
  | Omit<MenuOrderQuestion, 'correctIndexes'>
  | Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'>
  // People are sorted alphabetically so they don't leak the answer.
  | (Omit<TravelMapQuestion, 'correctGroups'> & { people: string[] })
  | Omit<MoneyVaseQuestion, 'correctCents'>;

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
