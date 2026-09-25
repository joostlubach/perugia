import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_STORE, RoomStore } from '../storage/store.interface';
import { AnswerEntry } from '../storage/room-parts';
import {
  countCorrectGroupings,
  countCorrectMenuPicks,
  countCorrectPlacements,
  countCorrectSelections,
  HamLine,
  isCorrectOption,
  mapDistanceKm,
  newJoinCode,
  newToken,
  scoreCount,
  scoreDistance,
  scoreForAnswer,
  scoreEstimate,
  scoreHamCut,
  scoreSketch,
  scoreTraceMarks,
  totalPlacements,
} from './room.util';
import { sampleQuestions } from './questions.sample';
import { CATEGORIES } from './categories';
import { addNpcs, answerForNpcs, planNpcAnswers } from './npc';
import { isRealAnswer, matchAnswers, matchesOpenAnswer, scoreHitList } from './open-answer';
import {
  AnswerDetail,
  CategoryView,
  HostGuess,
  HostPlayerAnswer,
  HostQuestionView,
  HostRoomView,
  LeaderboardEntry,
  Player,
  PlayerAnswer,
  PlayerQuestionView,
  PlayerRoomView,
  Point,
  Question,
  ReactionKind,
  OpenAnswerQuestion,
  Room,
  RoomStatus,
  RulingPick,
  SituationSketchQuestion,
  SketchPlacement,
} from './types';

@Injectable()
export class GameService {
  constructor(@Inject(ROOM_STORE) private readonly store: RoomStore) {}

  async createRoom(runthrough = false): Promise<{ hostToken: string }> {
    const questions: Question[] = sampleQuestions.map((q, i) => ({ ...q, id: `q${i}` }));

    const room: Room = {
      hostToken: newToken(),
      joinCode: newJoinCode(),
      status: 'lobby',
      questions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      players: {},
      createdAt: Date.now(),
      runthrough,
    };
    await this.store.delete();
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
    if (!(await this.store.addPlayer(player))) {
      throw new ForbiddenException('That avatar has already been picked');
    }
    return { playerId: id, playerToken: player.token };
  }

  async startGame(hostToken: string): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (room.status !== 'lobby') return;
    if (room.runthrough) await Promise.all(addNpcs(room).map((npc) => this.store.addPlayer(npc)));
    this.goToQuestion(room, 0);
    await this.store.set(room);
  }

  // `from` makes a double press (button plus space, or two quick presses)
  // advance only once: it's ignored unless the room is still in that status.
  async advance(hostToken: string, from?: RoomStatus): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (from && room.status !== from) return;

    if (room.status === 'category') {
      room.status = 'intro';
    } else if (room.status === 'intro') {
      room.status = 'question';
      room.questionStartedAt = Date.now();
      room.npcAnswers = planNpcAnswers(room, room.questions[room.currentQuestionIndex]);
    } else if (room.status === 'question') {
      await this.reveal(room);
    } else if (room.status === 'reveal') {
      const question = room.questions[room.currentQuestionIndex];
      if (question.type === 'open_answer' && question.rivalAnswerFrom) {
        if (!room.rivalRevealed) {
          room.rivalRevealed = true;
          await this.store.set(room);
          return;
        }
        // The host has to rule first (see rule).
        if (question.correctAnswer === undefined) return;
      }
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
    const keeper = playerWithAvatar(room, question.answerFrom);
    await this.store.setAnswers(this.gradeOpenAnswers(room, question, correctAnswer, keeper ? [keeper.id] : []));
    await this.store.set(room);
  }

  // At the reveal of an open question with a rival, once the rival's answer
  // is shown: the host picks whose answer counts, or that nobody scores.
  // Can be redone.
  async rule(hostToken: string, pick: RulingPick): Promise<void> {
    const room = await this.requireHost(hostToken);
    const question = room.questions[room.currentQuestionIndex];
    if (question?.type !== 'open_answer' || !question.rivalAnswerFrom) throw new BadRequestException('Nothing to rule on');
    if (room.status !== 'reveal' || !room.rivalRevealed) throw new BadRequestException('Reveal both answers first');
    const keeper = playerWithAvatar(room, question.answerFrom);
    const rival = playerWithAvatar(room, question.rivalAnswerFrom);
    const source = pick === 'answerFrom' ? keeper : pick === 'rival' ? rival : undefined;
    const text = source?.answers[question.id]?.text;
    if (pick !== 'nobody' && !isRealAnswer(text)) throw new BadRequestException('They did not answer');
    const sourceIds = [keeper, rival].flatMap((p) => (p ? [p.id] : []));
    await this.store.setAnswers(this.gradeOpenAnswers(room, question, pick === 'nobody' ? null : text!, sourceIds));
    await this.store.set(room);
  }

  // (Re)scores every typed answer against `correctAnswer`, or none of them
  // when it's null. The players who supplied an answer keep what they had
  // (nothing, or a penalty for not answering) -- they knew it.
  // Returns the rescored answers, to be saved.
  private gradeOpenAnswers(
    room: Room,
    question: OpenAnswerQuestion,
    correctAnswer: string | null,
    sourceIds: string[],
  ): AnswerEntry[] {
    question.correctAnswer = correctAnswer?.trim() ?? null;
    const entries: AnswerEntry[] = [];
    for (const player of Object.values(room.players)) {
      const answer = player.answers[question.id];
      // NPCs' made-up scores stand; they never typed anything to check.
      if (!answer || player.npc) continue;
      player.score -= answer.pointsAwarded;
      answer.correct = question.correctAnswer !== null && matchesOpenAnswer(answer.text ?? '', question.correctAnswer);
      answer.value = answer.correct ? 1 : 0;
      if (!sourceIds.includes(player.id)) {
        answer.pointsAwarded = answer.correct
          ? scoreForAnswer(question.points, question.timeLimitSec, answer.answeredAtMs)
          : 0;
      }
      player.score += answer.pointsAwarded;
      entries.push({ playerId: player.id, questionId: question.id, answer });
    }
    return entries;
  }

  // Host shortcut: straight to a question (zero-based), shown as its intro.
  // Earlier answers to it are wiped, points included, so it can be replayed.
  async goTo(hostToken: string, index: number): Promise<void> {
    const room = await this.requireHost(hostToken);
    if (index < 0 || index >= room.questions.length) throw new BadRequestException('No such question');
    const question = room.questions[index];
    const questionId = question.id;
    if (question.type === 'open_answer') question.correctAnswer = undefined;
    const answered = Object.values(room.players).filter((p) => p.answers[questionId]);
    await this.store.deleteAnswers(questionId, answered.map((p) => p.id));
    this.goToQuestion(room, index);
    await this.store.set(room);
  }

  // Host shortcut: back to the first question nobody has answered yet, or the
  // finale if they all have. Unlike goTo, no answers are wiped.
  async resume(hostToken: string): Promise<void> {
    const room = await this.requireHost(hostToken);
    const players = Object.values(room.players);
    const index = room.questions.findIndex((q) => !players.some((p) => p.answers[q.id]));
    if (index === -1) room.status = 'finale';
    else this.goToQuestion(room, index);
    await this.store.set(room);
  }

  // Host shortcut: straight to the finale, or past it to the results, from wherever the game is.
  async finish(hostToken: string, results = false): Promise<void> {
    const room = await this.requireHost(hostToken);
    room.status = results ? 'ended' : 'finale';
    await this.store.set(room);
  }

  // Opens with the category's splash screen when it's the first of its category.
  private goToQuestion(room: Room, index: number) {
    const category = room.questions[index].category;
    room.status = category && category !== room.questions[index - 1]?.category ? 'category' : 'intro';
    room.currentQuestionIndex = index;
    room.questionStartedAt = null;
    delete room.npcAnswers;
    delete room.rivalRevealed;
  }

  // Hands in the NPC answers that are due, and closes answering once time is
  // up or everyone has answered. Runs lazily whenever anyone polls, so
  // there's no timer to keep on the server.
  private async settle(room: Room): Promise<void> {
    if (room.status !== 'question' || !room.questionStartedAt) return;
    const question = room.questions[room.currentQuestionIndex];
    const now = Date.now();
    const due = answerForNpcs(room, question, now - room.questionStartedAt);
    await Promise.all(due.map((entry) => this.store.addAnswer(entry)));
    const timeUp = now >= room.questionStartedAt + question.timeLimitSec * 1000 + LATE_ANSWER_GRACE_MS;
    const lastAnswerAt = allAnsweredAt(room);
    const allDone = lastAnswerAt !== null && now >= lastAnswerAt + ALL_ANSWERED_DELAY_MS;
    if (!timeUp && !allDone) return;
    await this.reveal(room);
    await this.store.set(room);
  }

  private async reveal(room: Room) {
    room.status = 'reveal';
    const question = room.questions[room.currentQuestionIndex];
    if (question.type === 'open_answer') {
      await this.store.setAnswers([
        ...this.penalizeNoAnswer(room, question),
        // With a rival, the host rules on the answer instead (see rule).
        ...(question.rivalAnswerFrom ? [] : this.gradeByAnswerKey(room, question)),
      ]);
    }
    await Promise.all(answerForNpcs(room, question).map((entry) => this.store.addAnswer(entry)));
  }

  // An open question with `answerFrom` is scored against that player's own
  // answer. If they didn't answer, the host types the answer in instead.
  private gradeByAnswerKey(room: Room, question: OpenAnswerQuestion): AnswerEntry[] {
    const keeper = playerWithAvatar(room, question.answerFrom);
    const text = keeper?.answers[question.id]?.text;
    return keeper && isRealAnswer(text) ? this.gradeOpenAnswers(room, question, text!, [keeper.id]) : [];
  }

  // The answer key player loses `noAnswerPenalty` points if they're playing
  // but didn't really answer. Kept on their answer, so replaying the question undoes it.
  private penalizeNoAnswer(room: Room, question: OpenAnswerQuestion): AnswerEntry[] {
    const keeper = playerWithAvatar(room, question.answerFrom);
    if (!keeper || !question.noAnswerPenalty || isRealAnswer(keeper.answers[question.id]?.text)) return [];
    const answer: PlayerAnswer = {
      ...(keeper.answers[question.id] ?? { answeredAtMs: question.timeLimitSec * 1000, value: 0, correct: false }),
      pointsAwarded: -question.noAnswerPenalty,
    };
    keeper.score += answer.pointsAwarded - (keeper.answers[question.id]?.pointsAwarded ?? 0);
    keeper.answers[question.id] = answer;
    return [{ playerId: keeper.id, questionId: question.id, answer }];
  }

  async submitAnswer(
    playerId: string,
    playerToken: string,
    answer: number | string | string[] | string[][] | SketchPlacement[] | HamLine | number[] | Point[][] | Point,
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
    let point: Point | undefined;
    let detail: AnswerDetail | undefined;

    if (question.type === 'podium_order') {
      if (!Array.isArray(answer) || answer.some((group) => !Array.isArray(group))) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit per correctly placed driver; `correct` only when all are right.
      const total = totalPlacements(question.correctOrder);
      value = countCorrectPlacements(answer as string[][], question.correctOrder);
      detail = { order: answer as string[][] };
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
      detail = { order: answer as string[][] };
      correct = value === total;
      pointsAwarded =
        value > 0 ? scoreForAnswer(Math.round((question.points * value) / total), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'situation_sketch') {
      if (!isPlacements(answer)) throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how close each piece is to where it really was.
      value = scoreSketch(answer, question.correctPlacements, zoomedAspectRatio(question));
      detail = { placements: answer };
      correct = value >= SITUATION_SKETCH_CORRECT;
      pointsAwarded = value > 0 ? scoreForAnswer(Math.round((question.points * value) / 100), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'ham_cut') {
      if (Array.isArray(answer) || typeof answer !== 'object' || !('p1' in answer) || !('p2' in answer)) {
        throw new ForbiddenException('Wrong answer shape for this question');
      }
      // Partial credit for how close to a perfect 50/50 split the cut is.
      value = scoreHamCut(answer, question.rows);
      detail = { line: { p1: answer.p1, p2: answer.p2 } };
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
    } else if (question.type === 'map_pin') {
      if (!isPoint(answer)) throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how close to the right spot it was dropped.
      point = { x: answer.x, y: answer.y };
      const km = mapDistanceKm(point, question.answer, question.aspectRatio, question.mapWidthKm);
      const share = scoreDistance(km, question.fullPointsKm, question.zeroPointsKm);
      value = Math.round(km);
      correct = km <= question.fullPointsKm;
      pointsAwarded =
        share > 0 ? scoreForAnswer(Math.round(question.points * share), question.timeLimitSec, elapsedMs) : 0;
    } else if (question.type === 'trace_marks') {
      if (!isStrokes(answer)) throw new ForbiddenException('Wrong answer shape for this question');
      // Partial credit for how closely the drawing matches the real marks.
      value = scoreTraceMarks(answer, question.marks, question.aspectRatio);
      detail = { strokes: answer };
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
      selection = matched;
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
      selection = answer as number[];
      const total = question.options.length;
      value = countCorrectSelections(selection, question.correctIndexes, total);
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

    const saved = {
      value,
      answeredAtMs: elapsedMs,
      correct,
      pointsAwarded,
      ...(selection ? { selection } : {}),
      ...(text !== undefined ? { text } : {}),
      ...(point ? { point } : {}),
      ...(detail ? { detail } : {}),
    };
    // Only the answer itself is written, so answers arriving at the same time can't overwrite each other.
    await this.store.addAnswer({ playerId, questionId: question.id, answer: saved });
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

  // Only once revealed, like everyone's guesses.
  async getPlayerAnswer(hostToken: string, playerId: string): Promise<HostPlayerAnswer> {
    const room = await this.requireHost(hostToken);
    const player = room.players[playerId];
    const question = room.questions[room.currentQuestionIndex];
    if (!player || !question) throw new NotFoundException('No such player or question');
    const revealed = room.status === 'reveal' || room.status === 'leaderboard' || room.status === 'ended';
    return {
      playerId,
      name: player.name,
      avatar: player.avatar,
      answer: revealed ? player.answers[question.id] ?? null : null,
    };
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
    // Only after the reveal, so the tallies give no hints to slower players.
    const optionCounts =
      !question || !revealed
        ? []
        : question.type === 'multiple_choice'
        ? question.options.map(
            (_, i) => Object.values(room.players).filter((p) => p.answers[question.id]?.value === i).length,
          )
        : question.type === 'multi_text'
        ? question.correctAnswers.map(
            (_, i) =>
              Object.values(room.players).filter((p) => p.answers[question.id]?.selection?.includes(i)).length,
          )
        : question.type === 'multi_select'
        ? question.options.map(
            (_, i) =>
              Object.values(room.players).filter((p) => p.answers[question.id]?.selection?.includes(i)).length,
          )
        : question.type === 'menu_order'
        ? question.menu
            .flatMap((course) => course.dishes)
            .map(
              (_, i) =>
                Object.values(room.players).filter((p) => p.answers[question.id]?.selection?.includes(i)).length,
            )
        : [];
    const guesses: HostGuess[] =
      question && revealed
        ? Object.values(room.players)
            .filter((p) => p.answers[question.id])
            .map((p) => ({
              playerId: p.id,
              name: p.name,
              avatar: p.avatar,
              value: p.answers[question.id].value,
              correct: p.answers[question.id].correct,
              text: p.answers[question.id].text,
              point: p.answers[question.id].point,
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
          rivalAnswerFrom: question.rivalAnswerFrom,
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
      } else if (question.type === 'map_pin') {
        hostQuestion = {
          id: question.id,
          type: 'map_pin',
          title: question.title,
          text: question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          mapWidthKm: question.mapWidthKm,
          fullPointsKm: question.fullPointsKm,
          zeroPointsKm: question.zeroPointsKm,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
          ...(revealed ? { answer: question.answer } : {}),
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
          ...(revealed ? { correctIndexes: question.correctIndexes, revealOrder: question.revealOrder } : {}),
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
      category: categoryView(room),
      runthrough: Boolean(room.runthrough),
      answeredCount,
      optionCounts,
      guesses,
      afterReveal: afterReveal(room),
      rivalRevealed: Boolean(room.rivalRevealed),
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
      } else if (question.type === 'map_pin') {
        playerQuestion = {
          id: question.id,
          type: 'map_pin',
          title: question.title,
          text: question.playerText ?? question.text,
          mapUrl: question.mapUrl,
          aspectRatio: question.aspectRatio,
          mapWidthKm: question.mapWidthKm,
          fullPointsKm: question.fullPointsKm,
          zeroPointsKm: question.zeroPointsKm,
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
      else if (question.type === 'map_pin') correctValue = 0;
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
      avatar: player.avatar,
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

// When the last player answered the current question, or null while some still haven't.
function allAnsweredAt(room: Room): number | null {
  const question = room.questions[room.currentQuestionIndex];
  const players = Object.values(room.players);
  if (!question || !room.questionStartedAt || players.length === 0) return null;
  let last = 0;
  for (const player of players) {
    const answer = player.answers[question.id];
    if (!answer) return null;
    last = Math.max(last, answer.answeredAtMs);
  }
  return room.questionStartedAt + last;
}

function playerWithAvatar(room: Room, avatar: string | undefined): Player | undefined {
  return avatar ? Object.values(room.players).find((p) => p.avatar === avatar) : undefined;
}

function categoryView(room: Room): CategoryView | null {
  const key = room.questions[room.currentQuestionIndex]?.category;
  return (key && CATEGORIES[key as keyof typeof CATEGORIES]) || null;
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

function isPoint(answer: unknown): answer is Point {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
  const { x, y } = answer as Point;
  return Number.isFinite(x) && Number.isFinite(y);
}

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
