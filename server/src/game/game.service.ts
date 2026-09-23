import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_STORE, RoomStore } from '../storage/store.interface';
import {
  countCorrectGroupings,
  countCorrectMenuPicks,
  countCorrectPlacements,
  countCorrectPlateMarks,
  countCorrectSelections,
  HamLine,
  newJoinCode,
  newToken,
  PlateAnswer,
  scoreCount,
  scoreForAnswer,
  scoreEstimate,
  scoreHamCut,
  scoreTraceMarks,
  totalPlacements,
} from './room.util';
import { sampleQuestions } from './questions.sample';
import {
  HostGuess,
  HostQuestionView,
  HostRoomView,
  LeaderboardEntry,
  Player,
  PlayerQuestionView,
  PlayerRoomView,
  Point,
  Question,
  ReactionKind,
  Room,
  RoomStatus,
} from './types';

@Injectable()
export class GameService {
  constructor(@Inject(ROOM_STORE) private readonly store: RoomStore) {}

  async createRoom(): Promise<{ hostToken: string }> {
    const questions: Question[] = sampleQuestions.map((q, i) => ({ ...q, id: `q${i}` }));

    const room: Room = {
      hostToken: newToken(),
      joinCode: newJoinCode(),
      status: 'lobby',
      questions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      allAnsweredAt: null,
      players: {},
      createdAt: Date.now(),
    };
    await this.store.set(room);
    return { hostToken: room.hostToken };
  }

  async getJoinCode(): Promise<{ joinCode: string }> {
    const room = await this.requireRoom();
    return { joinCode: room.joinCode };
  }

  async joinRoom(joinCode: string, name: string, avatar: string): Promise<{ playerId: string; playerToken: string }> {
    const room = await this.requireRoom();
    if (joinCode !== room.joinCode) {
      throw new ForbiddenException('Scan the QR code on the big screen to join');
    }
    if (Object.values(room.players).some((p) => p.avatar === avatar)) {
      throw new ForbiddenException('That avatar has already been picked');
    }
    const id = newToken();
    const player: Player = {
      id,
      token: newToken(),
      name: name.trim().slice(0, 24) || 'Anonimo',
      avatar,
      score: 0,
      joinedAt: Date.now(),
      answers: {},
    };
    room.players[id] = player;
    await this.store.set(room);
    return { playerId: id, playerToken: player.token };
  }

  async startGame(hostToken: string): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (room.status !== 'lobby') return;
    this.goToQuestion(room, 0);
    await this.store.set(room);
  }

  // `from` makes a double press (button plus space, or two quick presses)
  // advance only once: it's ignored unless the room is still in that status.
  async advance(hostToken: string, from?: RoomStatus): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (from && room.status !== from) return;

    if (room.status === 'intro') {
      room.status = 'question';
      room.questionStartedAt = Date.now();
      room.allAnsweredAt = null;
    } else if (room.status === 'question') {
      room.status = 'reveal';
    } else if (room.status === 'reveal') {
      const next = afterReveal(room);
      if (next === 'intro') this.goToQuestion(room, room.currentQuestionIndex + 1);
      else room.status = next;
    } else if (room.status === 'leaderboard') {
      if (room.currentQuestionIndex + 1 < room.questions.length) this.goToQuestion(room, room.currentQuestionIndex + 1);
      else room.status = 'finale';
    } else if (room.status === 'finale') {
      room.status = 'ended';
    }
    await this.store.set(room);
  }

  // Host shortcut: straight to a question (zero-based), shown as its intro.
  // Earlier answers to it are wiped, points included, so it can be replayed.
  async goTo(hostToken: string, index: number): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (index < 0 || index >= room.questions.length) throw new BadRequestException('No such question');
    const questionId = room.questions[index].id;
    for (const player of Object.values(room.players)) {
      const answer = player.answers[questionId];
      if (!answer) continue;
      player.score -= answer.pointsAwarded;
      delete player.answers[questionId];
    }
    this.goToQuestion(room, index);
    await this.store.set(room);
  }

  // Host shortcut: straight to the final results, from wherever the game is.
  async finish(hostToken: string): Promise<void> {
    const room = await this.requireHost(hostToken);
    room.status = 'ended';
    await this.store.set(room);
  }

  private goToQuestion(room: Room, index: number) {
    room.status = 'intro';
    room.currentQuestionIndex = index;
    room.questionStartedAt = null;
    room.allAnsweredAt = null;
  }

  // Closes answering once time is up or everyone has answered. Runs lazily
  // whenever anyone polls, so there's no timer to keep on the server.
  private async settle(room: Room): Promise<void> {
    if (room.status !== 'question' || !room.questionStartedAt) return;
    const question = room.questions[room.currentQuestionIndex];
    const now = Date.now();
    const timeUp = now >= room.questionStartedAt + question.timeLimitSec * 1000 + LATE_ANSWER_GRACE_MS;
    const allDone = room.allAnsweredAt !== null && now >= room.allAnsweredAt + ALL_ANSWERED_DELAY_MS;
    if (!timeUp && !allDone) return;
    room.status = 'reveal';
    await this.store.set(room);
  }

  async submitAnswer(
    playerId: string,
    playerToken: string,
    answer: number | string[][] | PlateAnswer | HamLine | number[] | Point[][],
  ): Promise<void> {
    const room = await this.requireRoom();
    const player = room.players[playerId];
    if (!player || player.token !== playerToken) {
      throw new ForbiddenException('Unknown player');
    }
    const question = room.questions[room.currentQuestionIndex];
    if (!question || room.status !== 'question') {
      throw new ForbiddenException('No question is active');
    }
    if (player.answers[question.id]) {
      return; // already answered, ignore repeats
    }

    const elapsedMs = Date.now() - (room.questionStartedAt ?? Date.now());
    let value: number;
    let correct: boolean;
    let pointsAwarded: number;
    let selection: number[] | undefined;

    if (question.type === 'podium_order') {
      if (!Array.isArray(answer) || answer.some((group) => !Array.isArray(group))) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per correctly placed driver; `correct` only when all are right.
      const total = totalPlacements(question.correctOrder);
      value = countCorrectPlacements(answer as string[][], question.correctOrder);
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'travel_map') {
      if (!Array.isArray(answer) || answer.some((group) => !Array.isArray(group))) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per person placed at the right stop.
      const total = totalPlacements(question.correctGroups);
      value = countCorrectGroupings(answer as string[][], question.correctGroups);
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'plate_assignment') {
      if (Array.isArray(answer) || typeof answer !== 'object' || !('primo' in answer)) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per correct yes/no (had primo? had secondo?) per seat.
      const seats = [question.head, ...question.left, ...question.right];
      const total = seats.length * 2;
      value = countCorrectPlateMarks(answer, question, seats);
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'ham_cut') {
      if (Array.isArray(answer) || typeof answer !== 'object' || !('p1' in answer) || !('p2' in answer)) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit for how close to a perfect 50/50 split the cut is.
      value = scoreHamCut(answer, question.rows);
      correct = value >= 95;
      pointsAwarded = value > 0 ? scoreForAnswer(Math.round((question.points * value) / 100), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'money_vase') {
      if (typeof answer !== 'number') throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how close the estimate is; within 1% counts as correct.
      value = answer;
      const closeness = scoreEstimate(value, question.correctCents);
      correct = closeness >= MONEY_VASE_CORRECT;
      pointsAwarded =
        closeness > 0 ? scoreForAnswer(Math.round((question.points * closeness) / 100), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'trace_marks') {
      if (!isStrokes(answer)) throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how closely the drawing matches the real marks.
      value = scoreTraceMarks(answer, question.marks, question.aspectRatio);
      correct = value >= TRACE_MARKS_CORRECT;
      pointsAwarded = value > 0 ? scoreForAnswer(Math.round((question.points * value) / 100), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'menu_order') {
      if (!Array.isArray(answer) || answer.some((v) => typeof v !== 'number')) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per course ordered right.
      selection = answer as number[];
      const total = question.menu.length;
      value = countCorrectMenuPicks(selection, question.menu, question.correctIndexes);
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'multi_select') {
      if (!Array.isArray(answer) || answer.some((v) => typeof v !== 'number')) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per correctly-set checkbox (leaving a wrong one unchecked counts too).
      const total = question.options.length;
      value = countCorrectSelections(answer as number[], question.correctIndexes, total);
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'drag_count') {
      if (typeof answer !== 'number') throw new ForbiddenException('Wrong answer shape for this question');
      // Full points when exact; close guesses can earn a share (see nearMisses).
      value = answer;
      const share = scoreCount(value, question.correctCount, question.nearMisses);
      correct = share === 1;
      pointsAwarded =
        share > 0 ? scoreForAnswer(Math.round(question.points * share), question.timeLimitSec, elapsedMs) : 0;
    } else {
      if (typeof answer !== 'number') throw new ForbiddenException('Wrong answer shape for this question');
      value = answer;
      if (value < 0 || value >= question.options.length) {
        throw new ForbiddenException('Invalid option');
      }
      correct = value === question.correctIndex;
      pointsAwarded = correct ? scoreForAnswer(question.points, question.timeLimitSec, elapsedMs) : 0;
    }

    player.answers[question.id] = {
      value,
      answeredAtMs: elapsedMs,
      correct,
      pointsAwarded,
      ...(selection ? { selection } : {}),
    };
    player.score += pointsAwarded;
    if (Object.values(room.players).every((p) => p.answers[question.id])) {
      room.allAnsweredAt = Date.now();
    }
    await this.store.set(room);
  }

  async react(playerId: string, playerToken: string, kind: ReactionKind): Promise<void> {
    // Only reads the room (to check who's reacting); the reaction itself is
    // stored separately so it never overwrites an answer saved meanwhile.
    const room = await this.requireRoom();
    const player = room.players[playerId];
    if (!player || player.token !== playerToken) {
      throw new ForbiddenException('Unknown player');
    }
    await this.store.addReaction({
      id: newToken(),
      playerId,
      name: player.name,
      avatar: player.avatar,
      kind,
      at: Date.now(),
    });
  }

  async getHostView(hostToken: string): Promise<HostRoomView> {
    const room = await this.requireHost(hostToken);
    await this.settle(room);
    const since = Date.now() - REACTION_WINDOW_MS;
    const reactions = (await this.store.recentReactions()).filter((r) => r.at >= since);
    return { ...this.toHostView(room), reactions };
  }

  async getPlayerView(playerId: string, playerToken: string): Promise<PlayerRoomView> {
    const room = await this.requireRoom();
    const player = room.players[playerId];
    if (!player || player.token !== playerToken) {
      throw new ForbiddenException('Unknown player');
    }
    await this.settle(room);
    return this.toPlayerView(room, player);
  }

  private toHostView(room: Room): HostRoomView {
    const question = room.questions[room.currentQuestionIndex] ?? null;
    const revealed = room.status === 'reveal' || room.status === 'leaderboard' || room.status === 'ended';
    const answeredCount = question
      ? Object.values(room.players).filter((p) => p.answers[question.id]).length
      : 0;
    const optionCounts =
      question && question.type === 'multiple_choice'
        ? question.options.map(
            (_, i) => Object.values(room.players).filter((p) => p.answers[question.id]?.value === i).length,
          )
        : question && question.type === 'menu_order'
        ? question.menu
            .flatMap((course) => course.dishes)
            .map(
              (_, i) =>
                Object.values(room.players).filter((p) => p.answers[question.id]?.selection?.includes(i)).length,
            )
        : [];
    const guesses: HostGuess[] =
      question && question.type !== 'multiple_choice' && revealed
        ? Object.values(room.players)
            .filter((p) => p.answers[question.id])
            .map((p) => ({
              playerId: p.id,
              name: p.name,
              avatar: p.avatar,
              value: p.answers[question.id].value,
              correct: p.answers[question.id].correct,
            }))
        : [];

    let hostQuestion: HostQuestionView | null = null;
    if (question) {
      if (question.type === 'multiple_choice') {
        hostQuestion = {
          id: question.id,
          type: 'multiple_choice',
          title: question.title,
          text: question.text,
          options: question.options,
          imageUrl: question.imageUrl,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctIndex: question.correctIndex } : {}),
        };
      } else if (question.type === 'menu_order') {
        hostQuestion = {
          id: question.id,
          type: 'menu_order',
          title: question.title,
          text: question.text,
          menu: question.menu,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctIndexes: question.correctIndexes } : {}),
        };
      } else if (question.type === 'podium_order') {
        hostQuestion = {
          id: question.id,
          type: 'podium_order',
          title: question.title,
          text: question.text,
          groups: sortedGroups(question.correctOrder),
          groupLabels: question.groupLabels,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctOrder: question.correctOrder } : {}),
        };
      } else if (question.type === 'plate_assignment') {
        hostQuestion = {
          id: question.id,
          type: 'plate_assignment',
          title: question.title,
          text: question.text,
          head: question.head,
          left: question.left,
          right: question.right,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctPrimo: question.correctPrimo, correctSecondo: question.correctSecondo } : {}),
        };
      } else if (question.type === 'ham_cut') {
        hostQuestion = {
          id: question.id,
          type: 'ham_cut',
          title: question.title,
          text: question.text,
          imageUrl: question.imageUrl,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'trace_marks') {
        hostQuestion = {
          id: question.id,
          type: 'trace_marks',
          title: question.title,
          text: question.text,
          imageUrl: question.imageUrl,
          aspectRatio: question.aspectRatio,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { revealImageUrl: question.revealImageUrl } : {}),
        };
      } else if (question.type === 'travel_map') {
        hostQuestion = {
          id: question.id,
          type: 'travel_map',
          title: question.title,
          text: question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          landmarks: question.landmarks,
          stops: question.stops,
          people: sortedPeople(question.correctGroups),
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctGroups: question.correctGroups } : {}),
        };
      } else if (question.type === 'money_vase') {
        hostQuestion = {
          id: question.id,
          type: 'money_vase',
          title: question.title,
          text: question.text,
          denominations: question.denominations,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctCents: question.correctCents } : {}),
        };
      } else if (question.type === 'multi_select') {
        hostQuestion = {
          id: question.id,
          type: 'multi_select',
          title: question.title,
          text: question.text,
          options: question.options,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctIndexes: question.correctIndexes } : {}),
        };
      } else {
        hostQuestion = {
          id: question.id,
          type: 'drag_count',
          title: question.title,
          text: question.text,
          dragLabel: question.dragLabel,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctCount: question.correctCount } : {}),
        };
      }
      // The short version: the long `text` is only for the intro, read out loud.
      hostQuestion.playerText = question.playerText;
    }

    return {
      status: room.status,
      joinCode: room.joinCode,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionStartedAt: room.questionStartedAt,
      question: hostQuestion,
      answeredCount,
      optionCounts,
      guesses,
      afterReveal: afterReveal(room),
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
      leaderboard: this.leaderboard(room),
      reactions: [],
    };
  }

  private toPlayerView(room: Room, player: Player): PlayerRoomView {
    const question = room.questions[room.currentQuestionIndex] ?? null;
    const revealed = room.status === 'reveal' || room.status === 'leaderboard' || room.status === 'ended';
    const board = this.leaderboard(room);
    const rank = board.findIndex((p) => p.id === player.id) + 1;

    let playerQuestion: PlayerQuestionView | null = null;
    if (question && room.status === 'question') {
      if (question.type === 'podium_order') {
        playerQuestion = {
          id: question.id,
          type: 'podium_order',
          title: question.title,
          text: question.playerText ?? question.text,
          groups: sortedGroups(question.correctOrder),
          groupLabels: question.groupLabels,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'multiple_choice') {
        playerQuestion = {
          id: question.id,
          type: 'multiple_choice',
          title: question.title,
          text: question.playerText ?? question.text,
          options: question.options,
          imageUrl: question.imageUrl,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'menu_order') {
        playerQuestion = {
          id: question.id,
          type: 'menu_order',
          title: question.title,
          text: question.playerText ?? question.text,
          menu: question.menu,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'plate_assignment') {
        playerQuestion = {
          id: question.id,
          type: 'plate_assignment',
          title: question.title,
          text: question.playerText ?? question.text,
          head: question.head,
          left: question.left,
          right: question.right,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'ham_cut') {
        playerQuestion = {
          id: question.id,
          type: 'ham_cut',
          title: question.title,
          text: question.playerText ?? question.text,
          imageUrl: question.imageUrl,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'trace_marks') {
        playerQuestion = {
          id: question.id,
          type: 'trace_marks',
          title: question.title,
          text: question.playerText ?? question.text,
          imageUrl: question.imageUrl,
          aspectRatio: question.aspectRatio,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'travel_map') {
        playerQuestion = {
          id: question.id,
          type: 'travel_map',
          title: question.title,
          text: question.playerText ?? question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          landmarks: question.landmarks,
          stops: question.stops,
          people: sortedPeople(question.correctGroups),
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'money_vase') {
        playerQuestion = {
          id: question.id,
          type: 'money_vase',
          title: question.title,
          text: question.playerText ?? question.text,
          denominations: question.denominations,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'multi_select') {
        playerQuestion = {
          id: question.id,
          type: 'multi_select',
          title: question.title,
          text: question.playerText ?? question.text,
          options: question.options,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else {
        playerQuestion = {
          id: question.id,
          type: 'drag_count',
          title: question.title,
          text: question.playerText ?? question.text,
          dragLabel: question.dragLabel,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      }
    }

    let correctValue: number | null = null;
    if (question && revealed) {
      if (question.type === 'multiple_choice') correctValue = question.correctIndex;
      else if (question.type === 'drag_count') correctValue = question.correctCount;
      else if (question.type === 'podium_order') correctValue = totalPlacements(question.correctOrder);
      else if (question.type === 'travel_map') correctValue = totalPlacements(question.correctGroups);
      else if (question.type === 'money_vase') correctValue = question.correctCents;
      else if (question.type === 'ham_cut' || question.type === 'trace_marks') correctValue = 100;
      else if (question.type === 'multi_select') correctValue = question.options.length;
      else if (question.type === 'menu_order') correctValue = question.menu.length;
      else correctValue = [question.head, ...question.left, ...question.right].length * 2;
    }

    return {
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionStartedAt: room.questionStartedAt,
      question: playerQuestion,
      hasAnswered: question ? Boolean(player.answers[question.id]) : false,
      lastResult: question ? player.answers[question.id] ?? null : null,
      correctValue,
      score: player.score,
      rank: rank || board.length,
      playerCount: board.length,
    };
  }

  private leaderboard(room: Room): LeaderboardEntry[] {
    return Object.values(room.players)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private async requireRoom(): Promise<Room> {
    const room = await this.store.get();
    if (!room) {
      throw new NotFoundException('The room has not been created yet');
    }
    return room;
  }

  private async requireHost(hostToken: string): Promise<Room> {
    const room = await this.requireRoom();
    if (room.hostToken !== hostToken) {
      throw new ForbiddenException('Invalid host token');
    }
    return room;
  }
}

function afterReveal(room: Room): 'leaderboard' | 'intro' | 'finale' {
  const next = room.currentQuestionIndex + 1;
  if (next >= room.questions.length) return 'finale';
  return next % LEADERBOARD_EVERY === 0 ? 'leaderboard' : 'intro';
}

function sortedPeople(groups: string[][]): string[] {
  return groups.flat().sort();
}

function sortedGroups(groups: string[][]): string[][] {
  return groups.map((group) => [...group].sort());
}

const LEADERBOARD_EVERY = 5;
// After everyone has answered, give the last one a moment to look up.
const ALL_ANSWERED_DELAY_MS = 2000;
// Answers auto-submitted by phones as their countdown hits zero still count.
const LATE_ANSWER_GRACE_MS = 1500;
// Reactions older than this aren't sent to the host anymore.
const REACTION_WINDOW_MS = 10_000;
const TRACE_MARKS_CORRECT = 80;
const MONEY_VASE_CORRECT = 98;
const TRACE_MARKS_MAX_POINTS = 5000;

function isStrokes(answer: unknown): answer is Point[][] {
  if (!Array.isArray(answer)) return false;
  let total = 0;
  for (const stroke of answer) {
    if (!Array.isArray(stroke)) return false;
    total += stroke.length;
    if (!stroke.every((p) => p && typeof p.x === 'number' && typeof p.y === 'number')) return false;
  }
  return total <= TRACE_MARKS_MAX_POINTS;
}
