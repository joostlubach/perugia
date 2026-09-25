import { Player, PlayerAnswer, Room } from '../game/types';

// Stores keep the room in parts -- base state, one entry per player, one per
// answer -- so players answering or joining at the same moment never
// overwrite each other. `get()` puts them back together with this.
export function assembleRoom(
  base: StoredRoom,
  players: StoredPlayer[],
  answers: Record<string, PlayerAnswer>,
): Room {
  const room: Room = { ...base, players: {} };
  for (const stored of players) {
    room.players[stored.id] = { ...stored, score: 0, answers: {} };
  }
  for (const [field, answer] of Object.entries(answers)) {
    const { playerId, questionId } = parseAnswerField(field);
    const player = room.players[playerId];
    if (!player) continue;
    player.answers[questionId] = answer;
    player.score += answer.pointsAwarded;
  }
  return room;
}

export type StoredRoom = Omit<Room, 'players'>;
export type StoredPlayer = Omit<Player, 'score' | 'answers'>;

export interface AnswerEntry {
  playerId: string;
  questionId: string;
  answer: PlayerAnswer;
}

export function baseOf(room: Room): StoredRoom {
  const { players: _players, ...base } = room;
  return base;
}

export function storedPlayer(player: Player): StoredPlayer {
  const { score: _score, answers: _answers, ...stored } = player;
  return stored;
}

export function answerField(playerId: string, questionId: string): string {
  return `${playerId}:${questionId}`;
}

function parseAnswerField(field: string): { playerId: string; questionId: string } {
  const [playerId, questionId] = field.split(':');
  return { playerId, questionId };
}
