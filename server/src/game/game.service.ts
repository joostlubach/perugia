import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_STORE, RoomStore } from '../storage/store.interface';
import { CreateRoomDto, questionInputToQuestion } from './dto/create-room.dto';
import {
  countCorrectGroupings,
  countCorrectPlacements,
  countCorrectPlateMarks,
  countCorrectSelections,
  HamLine,
  newToken,
  PlateAnswer,
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
  Room,
} from './types';

@Injectable()
export class GameService {
  constructor(@Inject(ROOM_STORE) private readonly store: RoomStore) {}

  async createRoom(dto: CreateRoomDto): Promise<{ hostToken: string }> {
    const questions: Question[] =
      dto.questions && dto.questions.length > 0
        ? dto.questions.map((q, i) => questionInputToQuestion(q, `q${i}`))
        : sampleQuestions.map((q, i) => ({ ...q, id: `q${i}` }));

    const room: Room = {
      hostToken: newToken(),
      status: 'lobby',
      questions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      players: {},
      createdAt: Date.now(),
    };
    await this.store.set(room);
    return { hostToken: room.hostToken };
  }

  async joinRoom(name: string, avatar: string): Promise<{ playerId: string; playerToken: string }> {
    const room = await this.requireRoom();
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
    room.status = 'question';
    room.currentQuestionIndex = 0;
    room.questionStartedAt = Date.now();
    await this.store.set(room);
  }

  async advance(hostToken: string): Promise<void> {
    const room = await this.requireHost(hostToken);

    if (room.status === 'question') {
      room.status = 'reveal';
    } else if (room.status === 'reveal') {
      room.status = 'leaderboard';
    } else if (room.status === 'leaderboard') {
      const nextIndex = room.currentQuestionIndex + 1;
      if (nextIndex < room.questions.length) {
        room.currentQuestionIndex = nextIndex;
        room.questionStartedAt = Date.now();
        room.status = 'question';
      } else {
        room.status = 'ended';
      }
    }
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
    } else {
      if (typeof answer !== 'number') throw new ForbiddenException('Wrong answer shape for this question');
      value = answer;
      if (question.type === 'multiple_choice' && (value < 0 || value >= question.options.length)) {
        throw new ForbiddenException('Invalid option');
      }
      correct = question.type === 'multiple_choice' ? value === question.correctIndex : value === question.correctCount;
      pointsAwarded = correct ? scoreForAnswer(question.points, question.timeLimitSec, elapsedMs) : 0;
    }

    player.answers[question.id] = {
      value,
      answeredAtMs: elapsedMs,
      correct,
      pointsAwarded,
    };
    player.score += pointsAwarded;
    await this.store.set(room);
  }

  async getHostView(hostToken: string): Promise<HostRoomView> {
    const room = await this.requireHost(hostToken);
    return this.toHostView(room);
  }

  async getPlayerView(playerId: string, playerToken: string): Promise<PlayerRoomView> {
    const room = await this.requireRoom();
    const player = room.players[playerId];
    if (!player || player.token !== playerToken) {
      throw new ForbiddenException('Unknown player');
    }
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
          menu: question.menu,
          imageUrl: question.imageUrl,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctIndex: question.correctIndex } : {}),
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
    }

    return {
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionStartedAt: room.questionStartedAt,
      question: hostQuestion,
      answeredCount,
      optionCounts,
      guesses,
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
      leaderboard: this.leaderboard(room),
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
          menu: question.menu,
          imageUrl: question.imageUrl,
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

function sortedPeople(groups: string[][]): string[] {
  return groups.flat().sort();
}

function sortedGroups(groups: string[][]): string[][] {
  return groups.map((group) => [...group].sort());
}

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
