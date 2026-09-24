import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_STORE, RoomStore } from '../storage/store.interface';
import {
  countCorrectGroupings,
  countCorrectMenuPicks,
  countCorrectPlacements,
  countCorrectSelections,
  HamLine,
  isCorrectOption,
  newJoinCode,
  newToken,
  scoreCount,
  scoreForAnswer,
  scoreEstimate,
  scoreHamCut,
  scoreSketch,
  scoreTraceMarks,
  totalPlacements,
} from './room.util';
import { sampleQuestions } from './questions.sample';
import { matchAnswers, matchesOpenAnswer, scoreHitList } from './open-answer';
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
  OpenAnswerQuestion,
  Room,
  RoomStatus,
  SituationSketchQuestion,
  SketchPlacement,
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
      this.reveal(room);
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

  // The host types the right answer to an open question at its reveal; every
  // typed answer is (re)scored against it. Can be redone to fix a typo.
  async grade(hostToken: string, correctAnswer: string): Promise<void> {
    const room = await this.requireHost(hostToken);
    const question = room.questions[room.currentQuestionIndex];
    if (!question || question.type !== 'open_answer') throw new BadRequestException('Not an open question');
    if (room.status !== 'reveal') throw new BadRequestException('Answers can only be checked at the reveal');
    this.gradeOpenAnswers(room, question, correctAnswer, null);
    await this.store.set(room);
  }

  // (Re)scores every typed answer against `correctAnswer`. The player who
  // supplied the answer (if any) gets no points for it -- they knew it.
  private gradeOpenAnswers(room: Room, question: OpenAnswerQuestion, correctAnswer: string, keeperId: string | null) {
    question.correctAnswer = correctAnswer.trim();
    for (const player of Object.values(room.players)) {
      const answer = player.answers[question.id];
      if (!answer) continue;
      player.score -= answer.pointsAwarded;
      answer.correct = matchesOpenAnswer(answer.text ?? '', question.correctAnswer);
      answer.value = answer.correct ? 1 : 0;
      answer.pointsAwarded =
        answer.correct && player.id !== keeperId
          ? scoreForAnswer(question.points, question.timeLimitSec, answer.answeredAtMs)
          : 0;
      player.score += answer.pointsAwarded;
    }
  }

  // Host shortcut: straight to a question (zero-based), shown as its intro.
  // Earlier answers to it are wiped, points included, so it can be replayed.
  async goTo(hostToken: string, index: number): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (index < 0 || index >= room.questions.length) throw new BadRequestException('No such question');
    const question = room.questions[index];
    const questionId = question.id;
    if (question.type === 'open_answer') question.correctAnswer = undefined;
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
    this.reveal(room);
    await this.store.set(room);
  }

  private reveal(room: Room) {
    room.status = 'reveal';
    const question = room.questions[room.currentQuestionIndex];
    if (question.type === 'open_answer') this.gradeByAnswerKey(room, question);
  }

  // An open question with `answerFrom` is scored against that player's own
  // answer. If they didn't answer, the host types the answer in instead.
  private gradeByAnswerKey(room: Room, question: OpenAnswerQuestion) {
    if (!question.answerFrom) return;
    const keeper = Object.values(room.players).find((p) => p.avatar === question.answerFrom);
    const text = keeper?.answers[question.id]?.text;
    if (keeper && text) this.gradeOpenAnswers(room, question, text, keeper.id);
  }

  async submitAnswer(
    playerId: string,
    playerToken: string,
    answer: number | string | string[] | string[][] | SketchPlacement[] | HamLine | number[] | Point[][],
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
    let text: string | undefined;

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
    } else if (question.type === 'situation_sketch') {
      if (!isPlacements(answer)) throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how close each piece is to where it really was.
      value = scoreSketch(answer, question.correctPlacements, zoomedAspectRatio(question));
      correct = value >= SITUATION_SKETCH_CORRECT;
      pointsAwarded = value > 0 ? scoreForAnswer(Math.round((question.points * value) / 100), question.timeLimitSec, elapsedMs) : 0;
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
    } else if (question.type === 'open_answer') {
      if (typeof answer !== 'string') throw new ForbiddenException('Wrong answer shape for this question');
      // Scored later, once the host types in the right answer (see grade).
      text = answer.trim().slice(0, OPEN_ANSWER_MAX_LENGTH);
      value = 0;
      correct = false;
      pointsAwarded = 0;
    } else if (question.type === 'multi_text') {
      if (!Array.isArray(answer) || answer.some((v) => typeof v !== 'string')) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per right answer typed, more for ones higher up the list.
      const texts = (answer as string[]).map((t) => t.trim().slice(0, OPEN_ANSWER_MAX_LENGTH));
      text = texts.filter(Boolean).join(' / ');
      const matched = matchAnswers(texts.slice(0, question.boxes), question.correctAnswers);
      const share = scoreHitList(matched, question.correctAnswers.length, question.boxes);
      value = matched.length;
      correct = value === question.boxes;
      pointsAwarded =
        share > 0 ? scoreForAnswer(Math.round(question.points * share), question.timeLimitSec, elapsedMs) : 0;
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
      correct = isCorrectOption(question.correctIndex, value);
      pointsAwarded = correct ? scoreForAnswer(question.points, question.timeLimitSec, elapsedMs) : 0;
    }

    player.answers[question.id] = {
      value,
      answeredAtMs: elapsedMs,
      correct,
      pointsAwarded,
      ...(selection ? { selection } : {}),
      ...(text !== undefined ? { text } : {}),
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
              text: p.answers[question.id].text,
              pointsAwarded: p.answers[question.id].pointsAwarded,
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
      } else if (question.type === 'open_answer') {
        hostQuestion = {
          id: question.id,
          type: 'open_answer',
          title: question.title,
          text: question.text,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          correctAnswer: question.correctAnswer,
          answerFrom: question.answerFrom,
          showAnswersOf: question.showAnswersOf,
        };
      } else if (question.type === 'multi_text') {
        hostQuestion = {
          id: question.id,
          type: 'multi_text',
          title: question.title,
          text: question.text,
          boxes: question.boxes,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctAnswers: question.correctAnswers } : {}),
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
      } else if (question.type === 'situation_sketch') {
        hostQuestion = {
          id: question.id,
          type: 'situation_sketch',
          title: question.title,
          text: question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          zoom: question.zoom,
          pieces: question.pieces,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { correctPlacements: question.correctPlacements } : {}),
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
      previousLeaderboard: this.previousLeaderboard(room),
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
      } else if (question.type === 'open_answer') {
        playerQuestion = {
          id: question.id,
          type: 'open_answer',
          title: question.title,
          text: question.playerText ?? question.text,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        };
      } else if (question.type === 'multi_text') {
        playerQuestion = {
          id: question.id,
          type: 'multi_text',
          title: question.title,
          text: question.playerText ?? question.text,
          boxes: question.boxes,
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
      } else if (question.type === 'situation_sketch') {
        playerQuestion = {
          id: question.id,
          type: 'situation_sketch',
          title: question.title,
          text: question.playerText ?? question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          zoom: question.zoom,
          pieces: question.pieces,
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
      if (question.type === 'multiple_choice') {
        correctValue = Array.isArray(question.correctIndex) ? question.correctIndex[0] : question.correctIndex;
      }
      else if (question.type === 'drag_count') correctValue = question.correctCount;
      else if (question.type === 'podium_order') correctValue = totalPlacements(question.correctOrder);
      else if (question.type === 'travel_map') correctValue = totalPlacements(question.correctGroups);
      else if (question.type === 'money_vase') correctValue = question.correctCents;
      else if (question.type === 'ham_cut' || question.type === 'trace_marks' || question.type === 'situation_sketch') {
        correctValue = 100;
      }
      else if (question.type === 'multi_select') correctValue = question.options.length;
      else if (question.type === 'menu_order') correctValue = question.menu.length;
      else if (question.type === 'multi_text') correctValue = question.boxes;
      else correctValue = 1;
    }

    return {
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionStartedAt: room.questionStartedAt,
      question: playerQuestion,
      hasAnswered: question ? Boolean(player.answers[question.id]) : false,
      awaitingGrading: question?.type === 'open_answer' && revealed && question.correctAnswer === undefined,
      lastResult: question ? player.answers[question.id] ?? null : null,
      correctValue,
      score: player.score,
      rank: rank || board.length,
      playerCount: board.length,
    };
  }

  private leaderboard(room: Room): LeaderboardEntry[] {
    return sortLeaderboard(
      Object.values(room.players).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
    );
  }

  // The standings as they were at the previous ranking screen, so the host
  // can animate from there. Only on a ranking screen that isn't the first.
  private previousLeaderboard(room: Room): LeaderboardEntry[] | null {
    if (room.status !== 'leaderboard') return null;
    const lastIndex = room.currentQuestionIndex - LEADERBOARD_EVERY;
    if (lastIndex < 0) return null;
    const questionIds = room.questions.slice(0, lastIndex + 1).map((q) => q.id);
    return sortLeaderboard(
      Object.values(room.players).map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: questionIds.reduce((sum, id) => sum + (p.answers[id]?.pointsAwarded ?? 0), 0),
      })),
    );
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

function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
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
const OPEN_ANSWER_MAX_LENGTH = 100;
// After everyone has answered, give the last one a moment to look up.
const ALL_ANSWERED_DELAY_MS = 2000;
// Answers auto-submitted by phones as their countdown hits zero still count.
const LATE_ANSWER_GRACE_MS = 1500;
// Reactions older than this aren't sent to the host anymore.
const REACTION_WINDOW_MS = 10_000;
const TRACE_MARKS_CORRECT = 80;
const SITUATION_SKETCH_CORRECT = 80;
const MONEY_VASE_CORRECT = 98;
const TRACE_MARKS_MAX_POINTS = 5000;
const SITUATION_SKETCH_MAX_PIECES = 50;

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

function zoomedAspectRatio(question: SituationSketchQuestion): number {
  return (question.aspectRatio * question.zoom.width) / question.zoom.height;
}

function isPlacements(answer: unknown): answer is SketchPlacement[] {
  return (
    Array.isArray(answer) &&
    answer.length <= SITUATION_SKETCH_MAX_PIECES &&
    answer.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        typeof p.rotation === 'number',
    )
  );
}
