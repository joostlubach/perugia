import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_STORE, RoomStore } from '../storage/store.interface';
import { CreateRoomDto, questionInputToQuestion } from './dto/create-room.dto';
import { newRoomCode, newToken, scoreForAnswer } from './room.util';
import { sampleQuestions } from './questions.sample';
import {
  HostGuess,
  HostQuestionView,
  HostRoomView,
  Player,
  PlayerQuestionView,
  PlayerRoomView,
  Question,
  Room,
} from './types';

@Injectable()
export class GameService {
  constructor(@Inject(ROOM_STORE) private readonly store: RoomStore) {}

  async createRoom(dto: CreateRoomDto): Promise<{ code: string; hostToken: string }> {
    const questions: Question[] =
      dto.questions && dto.questions.length > 0
        ? dto.questions.map((q, i) => questionInputToQuestion(q, `q${i}`))
        : sampleQuestions.map((q, i) => ({ ...q, id: `q${i}` }));

    let code = newRoomCode();
    while (await this.store.get(code)) {
      code = newRoomCode();
    }

    const room: Room = {
      code,
      hostToken: newToken(),
      status: 'lobby',
      questions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      players: {},
      createdAt: Date.now(),
    };
    await this.store.set(room);
    return { code: room.code, hostToken: room.hostToken };
  }

  async joinRoom(code: string, name: string): Promise<{ playerId: string; playerToken: string }> {
    const room = await this.requireRoom(code);
    const id = newToken();
    const player: Player = {
      id,
      token: newToken(),
      name: name.trim().slice(0, 24) || 'Anonimo',
      score: 0,
      joinedAt: Date.now(),
      answers: {},
    };
    room.players[id] = player;
    await this.store.set(room);
    return { playerId: id, playerToken: player.token };
  }

  async startGame(code: string, hostToken: string): Promise<void> {
    const room = await this.requireHost(code, hostToken);
    room.status = 'question';
    room.currentQuestionIndex = 0;
    room.questionStartedAt = Date.now();
    await this.store.set(room);
  }

  async advance(code: string, hostToken: string): Promise<void> {
    const room = await this.requireHost(code, hostToken);

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

  async submitAnswer(code: string, playerId: string, playerToken: string, value: number): Promise<void> {
    const room = await this.requireRoom(code);
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
    if (question.type === 'multiple_choice' && (value < 0 || value >= question.options.length)) {
      throw new ForbiddenException('Invalid option');
    }

    const elapsedMs = Date.now() - (room.questionStartedAt ?? Date.now());
    const correct =
      question.type === 'multiple_choice' ? value === question.correctIndex : value === question.correctCount;
    const pointsAwarded = correct ? scoreForAnswer(question.points, question.timeLimitSec, elapsedMs) : 0;

    player.answers[question.id] = {
      value,
      answeredAtMs: elapsedMs,
      correct,
      pointsAwarded,
    };
    player.score += pointsAwarded;
    await this.store.set(room);
  }

  async getHostView(code: string, hostToken: string): Promise<HostRoomView> {
    const room = await this.requireHost(code, hostToken);
    return this.toHostView(room);
  }

  async getPlayerView(code: string, playerId: string, playerToken: string): Promise<PlayerRoomView> {
    const room = await this.requireRoom(code);
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
      question && question.type === 'drag_count' && revealed
        ? Object.values(room.players)
            .filter((p) => p.answers[question.id])
            .map((p) => ({
              playerId: p.id,
              name: p.name,
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
          text: question.text,
          options: question.options,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctIndex: question.correctIndex } : {}),
        };
      } else {
        hostQuestion = {
          id: question.id,
          type: 'drag_count',
          text: question.text,
          dragLabel: question.dragLabel,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctCount: question.correctCount } : {}),
        };
      }
    }

    return {
      code: room.code,
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionStartedAt: room.questionStartedAt,
      question: hostQuestion,
      answeredCount,
      optionCounts,
      guesses,
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map((p) => ({ id: p.id, name: p.name, score: p.score })),
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
      playerQuestion =
        question.type === 'multiple_choice'
          ? {
              id: question.id,
              type: 'multiple_choice',
              text: question.text,
              options: question.options,
              timeLimitSec: question.timeLimitSec,
              points: question.points,
            }
          : {
              id: question.id,
              type: 'drag_count',
              text: question.text,
              dragLabel: question.dragLabel,
              timeLimitSec: question.timeLimitSec,
              points: question.points,
            };
    }

    const correctValue = question && revealed
      ? question.type === 'multiple_choice'
        ? question.correctIndex
        : question.correctCount
      : null;

    return {
      code: room.code,
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

  private leaderboard(room: Room) {
    return Object.values(room.players)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private async requireRoom(code: string): Promise<Room> {
    const room = await this.store.get(code.toUpperCase());
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  private async requireHost(code: string, hostToken: string): Promise<Room> {
    const room = await this.requireRoom(code);
    if (room.hostToken !== hostToken) {
      throw new ForbiddenException('Invalid host token');
    }
    return room;
  }
}
