import { AVATAR_KEYS } from './avatars';
import { isCorrectOption, newToken, scoreCount, scoreDistance, scoreEstimate, scoreForAnswer } from './room.util';
import { PlayerAnswer, Question, Room } from './types';

// Fills every avatar nobody picked with an NPC, for a runthrough.
export function addNpcs(room: Room) {
  const taken = new Set(Object.values(room.players).map((p) => p.avatar));
  for (const avatar of AVATAR_KEYS) {
    if (taken.has(avatar)) continue;
    const id = newToken();
    room.players[id] = {
      id,
      token: newToken(),
      name: avatar.charAt(0).toUpperCase() + avatar.slice(1),
      avatar,
      score: 0,
      joinedAt: Date.now(),
      answers: {},
      npc: true,
    };
  }
}

// Gives every NPC that hasn't answered `question` yet a random answer.
export function answerForNpcs(room: Room, question: Question) {
  for (const player of Object.values(room.players)) {
    if (!player.npc || player.answers[question.id]) continue;
    const answer = randomAnswer(question);
    player.answers[question.id] = answer;
    player.score += answer.pointsAwarded;
  }
}

// Roughly plausible, so the reveal screens look sensible too.
function randomAnswer(question: Question): PlayerAnswer {
  const answeredAtMs = Math.round((0.2 + Math.random() * 0.75) * question.timeLimitSec * 1000);
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
