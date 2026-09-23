import { Reaction, Room } from '../game/types';

// There's only ever one room -- a single reunion, played once.
export interface RoomStore {
  get(): Promise<Room | null>;
  set(room: Room): Promise<void>;
  delete(): Promise<void>;
  // Reactions are kept apart from the room so a burst of them can't race
  // with (and overwrite) answers being saved at the same moment.
  addReaction(reaction: Reaction): Promise<void>;
  recentReactions(): Promise<Reaction[]>;
}

// How many reactions to keep around; older ones are dropped.
export const MAX_REACTIONS = 40;

export const ROOM_STORE = Symbol('ROOM_STORE');
