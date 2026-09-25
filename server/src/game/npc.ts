import { AVATAR_KEYS } from './avatars';
import { isCorrectOption, newToken, scoreCount, scoreDistance, scoreEstimate, scoreForAnswer } from './room.util';
import { AnswerEntry } from '../storage/room-parts';
import { Player, PlayerAnswer, Question, Room } from './types';

// Fills every avatar nobody picked with an NPC, for a runthrough. Returns
// the NPCs added, to be saved.
export function addNpcs(room: Room): Player[] {
  const taken = new Set(Object.values(room.players).map((p) => p.avatar));
  const added: Player[] = [];
  for (const avatar of AVATAR_KEYS) {
    if (taken.has(avatar)) continue;
    const id = newToken();
    const npc: Player = {
      id,
      token: newToken(),
      name: avatar.charAt(0).toUpperCase() + avatar.slice(1),
      avatar,
      score: 0,
      joinedAt: Date.now(),
      answers: {},
      npc: true,
    };
    room.players[id] = npc;
    added.push(npc);
  }
  return added;
}

// Draws every NPC's answer to `question` up front. Most land within a moment
// of each other, to rehearse a room full of people answering at once.
export function planNpcAnswers(room: Room, question: Question): Record<string, PlayerAnswer> {
  const limitMs = question.timeLimitSec * 1000;
  const burstAtMs = (0.25 + Math.random() * 0.5) * limitMs;
  const plan: Record<string, PlayerAnswer> = {};
  for (const player of Object.values(room.players)) {
    if (!player.npc) continue;
    const answeredAtMs =
      Math.random() < NPC_BURST_CHANCE
        ? burstAtMs + (Math.random() - 0.5) * NPC_BURST_SPREAD_MS
        : (0.1 + Math.random() * 0.85) * limitMs;
    plan[player.id] = randomAnswer(question, Math.round(Math.max(500, Math.min(limitMs - 500, answeredAtMs))));
  }
  return plan;
}

// Hands in the planned NPC answers due by `elapsedMs` -- all of them by default.
// Returns those answers, to be saved.
export function answerForNpcs(room: Room, question: Question, elapsedMs = Infinity): AnswerEntry[] {
  const entries: AnswerEntry[] = [];
  for (const [playerId, answer] of Object.entries(room.npcAnswers ?? {})) {
    const player = room.players[playerId];
    if (!player || player.answers[question.id] || answer.answeredAtMs > elapsedMs) continue;
    player.answers[question.id] = answer;
    player.score += answer.pointsAwarded;
    entries.push({ playerId: player.id, questionId: question.id, answer });
  }
  return entries;
}

// Roughly plausible, so the reveal screens look sensible too.
function randomAnswer(question: Question, answeredAtMs: number): PlayerAnswer {
  const withShare = (share: number, value: number, correct: boolean): PlayerAnswer => ({
    answeredAtMs,
    value,
    correct,
    pointsAwarded:
      share > 0 ? scoreForAnswer(Math.round(question.points * share), question.timeLimitSec, answeredAtMs) : 0,
  });

  if (question.type === 'multiple_choice') {
    const right = [question.correctIndex].flat()[0];
    const option = Math.random() < NPC_RIGHT_CHANCE ? right : Math.floor(Math.random() * question.options.length);
    const correct = isCorrectOption(question.correctIndex, option);
    return withShare(correct ? 1 : 0, option, correct);
  }
  if (question.type === 'map_pin') {
    const km = Math.random() ** 2 * question.zeroPointsKm * 1.2;
    const angle = Math.random() * Math.PI * 2;
    const point = {
      x: clamp(question.answer.x + (Math.cos(angle) * km) / question.mapWidthKm),
      y: clamp(question.answer.y + (Math.sin(angle) * km * question.aspectRatio) / question.mapWidthKm),
    };
    const share = scoreDistance(km, question.fullPointsKm, question.zeroPointsKm);
    return { ...withShare(share, Math.round(km), km <= question.fullPointsKm), point };
  }
  if (question.type === 'money_vase') {
    const cents = Math.round(question.correctCents * (0.5 + Math.random()));
    const closeness = scoreEstimate(cents, question.correctCents);
    return withShare(closeness / 100, cents, closeness >= 98);
  }
  if (question.type === 'drag_count') {
    const count = Math.max(0, question.correctCount + Math.round((Math.random() - 0.5) * 20));
    const share = scoreCount(count, question.correctCount, question.nearMisses);
    return withShare(share, count, share === 1);
  }
  const share = Math.random() < NPC_RIGHT_CHANCE ? 0.4 + Math.random() * 0.6 : Math.random() * 0.3;
  // The percentage for the types scored that way; ignored for the rest.
  return withShare(share, Math.round(share * 100), share > 0.9);
}

function clamp(fraction: number): number {
  return Math.max(0, Math.min(1, fraction));
}

const NPC_RIGHT_CHANCE = 0.55;
const NPC_BURST_CHANCE = 0.85;
const NPC_BURST_SPREAD_MS = 600;
