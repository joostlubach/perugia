import { Room } from '../game/types';

// There's only ever one room -- a single reunion, played once.
export interface RoomStore {
  get(): Promise<Room | null>;
  set(room: Room): Promise<void>;
  delete(): Promise<void>;
}

export const ROOM_STORE = Symbol('ROOM_STORE');
