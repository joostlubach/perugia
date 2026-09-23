import { Room } from '../game/types';

export interface RoomStore {
  get(code: string): Promise<Room | null>;
  set(room: Room): Promise<void>;
  delete(code: string): Promise<void>;
}

export const ROOM_STORE = Symbol('ROOM_STORE');
