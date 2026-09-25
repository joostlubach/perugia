// `category` is a splash screen before the first question of each category.
// `intro` shows the question on the big screen while the host reads it out;
// answering only opens in `question`. `finale` is a pause before the final results.
export type RoomStatus = 'lobby' | 'category' | 'intro' | 'question' | 'reveal' | 'leaderboard' | 'finale' | 'ended';

export interface Category {
  title: string;
  emoji: string;
  imageUrl?: string;
  // Played with sound instead of the image; the quiz music pauses for it.
  videoUrl?: string;
}

// The current question's category, with its place among all categories.
export interface CategoryView extends Category {
  number: number;
  total: number;
}

interface QuestionBase {
  id: string;
  // Key into CATEGORIES (see categories.ts).
  category: string;
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
  // Several indexes when more than one answer counts (players still pick one).
  correctIndex: number | number[];
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

// Player types a free answer. Nobody knows the right one beforehand: it's
// whatever the `answerFrom` player typed, or else what the host types in at
// the reveal. Answers are only scored then.
export interface OpenAnswerQuestion extends QuestionBase {
  type: 'open_answer';
  // Set at the reveal.
  correctAnswer?: string;
  // Avatar key of the player whose answer is the right one (e.g. the cook).
  answerFrom?: string;
  // Other players whose answers are shown on the big screen too. Everyone
  // else's stays private.
  showAnswersOf?: string[];
}

// Player types an answer in each of `boxes` boxes, scored right away against
// a fixed list, which may hold more right answers than there are boxes. Each
// right answer counts once.
export interface MultiTextQuestion extends QuestionBase {
  type: 'multi_text';
  boxes: number;
  correctAnswers: string[];
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
  // Partial credit for guesses that are close: within `maxOff` of the right
  // count earns `share` (0-1) of the points. Tightest band first.
  nearMisses?: NearMiss[];
}

export interface NearMiss {
  maxOff: number;
  share: number;
}

// Player sorts the avatars of each group onto a podium in finishing order.
export interface PodiumOrderQuestion extends QuestionBase {
  type: 'podium_order';
  // Avatar keys per group, first place first.
  correctOrder: string[][];
  groupLabels: string[];
}

// Player drags and rotates pieces (an avatar in a go-kart, or lying on the
// ground) onto a map to sketch a situation. Scored per piece by how close it
// is to where it really was; how it's turned doesn't count.
export interface SituationSketchQuestion extends QuestionBase {
  type: 'situation_sketch';
  mapUrl: string;
  // Map width / height.
  aspectRatio: number;
  // The part of the map that's sketched on, zoomed in on once answering opens.
  zoom: MapArea;
  pieces: SketchPiece[];
  correctPlacements: SketchPlacement[];
}

export interface SketchPiece {
  id: string;
  kind: 'kart' | 'body';
  // Whose face is on it, if anyone's.
  avatar?: string;
  // Shown in the tray instead of the avatar's name.
  label?: string;
}

// In fractions of the map's width/height from the top left.
export interface MapArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Where a piece's center is, in fractions of the zoomed area's width/height
// from its top left, and how far it's turned clockwise, in degrees (only for show).
export interface SketchPlacement {
  id: string;
  x: number;
  y: number;
  rotation: number;
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

// Player drags their own avatar onto the spot on the map where `answer` is.
// Scored by distance: full points within `fullPointsKm`, none beyond `zeroPointsKm`.
export interface MapPinQuestion extends QuestionBase {
  type: 'map_pin';
  mapUrl: string;
  // Map width / height.
  aspectRatio: number;
  mapWidthKm: number;
  answer: Point;
  fullPointsKm: number;
  zeroPointsKm: number;
}

export type Question =
  | MultipleChoiceQuestion
  | MapPinQuestion
  | MoneyVaseQuestion
  | TravelMapQuestion
  | DragCountQuestion
  | PodiumOrderQuestion
  | SituationSketchQuestion
  | HamCutQuestion
  | MultiSelectQuestion
  | MenuOrderQuestion
  | OpenAnswerQuestion
  | MultiTextQuestion
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
  // guessed amount in cents for money_vase, distance in km for map_pin.
  value: number;
  // Where the avatar was dropped -- map_pin.
  point?: Point;
  // The dish indexes ordered -- menu_order; options ticked -- multi_select;
  // indexes of the correct answers typed -- multi_text.
  selection?: number[];
  // What was typed -- open_answer; every box joined by " / " -- multi_text.
  text?: string;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
  answers: Record<string, PlayerAnswer>;
  // Stand-in for everyone who didn't join a runthrough; answers randomly.
  npc?: boolean;
}

export const REACTION_KINDS = ['mammamia', 'mario', 'losing', 'gibberish', 'congratulations', 'letsgo', 'luigi'] as const;
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
  // A rehearsal: starting fills every free avatar with an NPC.
  runthrough?: boolean;
}

// The category shows on its own splash screen instead.
export type HostQuestionView = DistributiveOmit<
  | (Omit<MultipleChoiceQuestion, 'correctIndex'> & { correctIndex?: number | number[] })
  | (Omit<DragCountQuestion, 'correctCount'> & { correctCount?: number })
  | (Omit<PodiumOrderQuestion, 'correctOrder'> & { groups: string[][]; correctOrder?: string[][] })
  | (Omit<SituationSketchQuestion, 'correctPlacements'> & { correctPlacements?: SketchPlacement[] })
  | Omit<HamCutQuestion, 'rows'>
  | (Omit<MultiSelectQuestion, 'correctIndexes'> & { correctIndexes?: number[] })
  | (Omit<MenuOrderQuestion, 'correctIndexes'> & { correctIndexes?: number[] })
  | OpenAnswerQuestion
  | (Omit<MultiTextQuestion, 'correctAnswers'> & { correctAnswers?: string[] })
  | (Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'> & { revealImageUrl?: string })
  | (Omit<TravelMapQuestion, 'correctGroups'> & { people: string[]; correctGroups?: string[][] })
  | (Omit<MoneyVaseQuestion, 'correctCents'> & { correctCents?: number })
  | (Omit<MapPinQuestion, 'answer'> & { answer?: Point }),
  'category'
>;

export interface HostGuess {
  playerId: string;
  name: string;
  avatar: string;
  value: number;
  correct: boolean;
  // What was typed -- open_answer and multi_text only.
  text?: string;
  // Where the avatar was dropped -- map_pin only.
  point?: Point;
  pointsAwarded: number;
}

export interface HostRoomView {
  status: RoomStatus;
  joinCode: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: HostQuestionView | null;
  category: CategoryView | null;
  runthrough: boolean;
  // A runthrough nobody joined: questions reveal themselves, without a countdown.
  npcsOnly: boolean;
  answeredCount: number;
  // Only populated for multiple_choice and menu_order questions.
  optionCounts: number[];
  // Only populated for drag_count and podium_order questions once revealed.
  guesses: HostGuess[];
  // Where advancing from the reveal goes.
  afterReveal: 'leaderboard' | 'intro' | 'finale';
  playerCount: number;
  players: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  // Standings at the previous ranking screen, on every ranking screen but the first.
  previousLeaderboard: LeaderboardEntry[] | null;
  // Reactions from the last few seconds, oldest first.
  reactions: Reaction[];
}

// The category shows on its own splash screen instead.
export type PlayerQuestionView = DistributiveOmit<
  | Omit<MultipleChoiceQuestion, 'correctIndex'>
  | Omit<DragCountQuestion, 'correctCount'>
  // Groups are sorted alphabetically so they don't leak the answer.
  | (Omit<PodiumOrderQuestion, 'correctOrder'> & { groups: string[][] })
  | Omit<SituationSketchQuestion, 'correctPlacements'>
  | Omit<HamCutQuestion, 'rows'>
  | Omit<MultiSelectQuestion, 'correctIndexes'>
  | Omit<MenuOrderQuestion, 'correctIndexes'>
  | Omit<OpenAnswerQuestion, 'correctAnswer'>
  | Omit<MultiTextQuestion, 'correctAnswers'>
  | Omit<TraceMarksQuestion, 'marks' | 'revealImageUrl'>
  // People are sorted alphabetically so they don't leak the answer.
  | (Omit<TravelMapQuestion, 'correctGroups'> & { people: string[] })
  | Omit<MoneyVaseQuestion, 'correctCents'>
  | Omit<MapPinQuestion, 'answer'>,
  'category'
>;

export interface PlayerRoomView {
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  question: PlayerQuestionView | null;
  hasAnswered: boolean;
  // An open_answer question that the host hasn't given the right answer for yet.
  awaitingGrading: boolean;
  lastResult: PlayerAnswer | null;
  // The player's own avatar key.
  avatar: string;
  // The correct option index, correct count or total placements, depending on question type.
  correctValue: number | null;
  score: number;
  rank: number;
  playerCount: number;
}
