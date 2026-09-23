import { Injectable } from '@nestjs/common';
import { Reaction, Room } from '../game/types';
import { MAX_REACTIONS, RoomStore } from './store.interface';

// Works well enough for local dev and for a single warm Vercel instance.
// For a live event with real traffic across multiple lambda instances,
// prefer KvRoomStore (see kv-store.ts).
@Injectable()
export class MemoryRoomStore implements RoomStore {
  private room: Room | null = null;
  private reactions: Reaction[] = [];

  async get(): Promise<Room | null> {
    return this.room;
  }

  async set(room: Room): Promise<void> {
    this.room = room;
  }

  async delete(): Promise<void> {
    this.room = null;
    this.reactions = [];
  }

  async addReaction(reaction: Reaction): Promise<void> {
    this.reactions = [...this.reactions, reaction].slice(-MAX_REACTIONS);
  }

  async recentReactions(): Promise<Reaction[]> {
    return this.reactions;
  }
}
