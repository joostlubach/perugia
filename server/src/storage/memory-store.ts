import { Injectable } from '@nestjs/common';
import { Room } from '../game/types';
import { RoomStore } from './store.interface';

// Works well enough for local dev and for a single warm Vercel instance.
// For a live event with real traffic across multiple lambda instances,
// prefer KvRoomStore (see kv-store.ts).
@Injectable()
export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();

  async get(code: string): Promise<Room | null> {
    return this.rooms.get(code) ?? null;
  }

  async set(room: Room): Promise<void> {
    this.rooms.set(room.code, room);
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }
}
