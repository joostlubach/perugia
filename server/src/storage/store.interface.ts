import { Player, Reaction, Room } from '../game/types';
import { AnswerEntry } from './room-parts';

// There's only ever one room -- a single reunion, played once.
export interface RoomStore {
  get(): Promise<Room | null>;
  // Saves the room's own state only: players and answers go through the
  // calls below, so a stale copy of the room can never wipe them.
  set(room: Room): Promise<void>;
  delete(): Promise<void>;
  // False when the avatar has already been picked.
  addPlayer(player: Player): Promise<boolean>;
  // False when the player had already answered this question.
  addAnswer(entry: AnswerEntry): Promise<boolean>;
  // Overwrites, for rescoring.
  setAnswers(entries: AnswerEntry[]): Promise<void>;
  deleteAnswers(questionId: string, playerIds: string[]): Promise<void>;
  // Reactions are kept apart from the room so a burst of them can't race
  // with (and overwrite) answers being saved at the same moment.
  addReaction(reaction: Reaction): Promise<void>;
  recentReactions(): Promise<Reaction[]>;
}

// How many reactions to keep around; older ones are dropped.
export const MAX_REACTIONS = 40;

export const ROOM_STORE = Symbol('ROOM_STORE');
