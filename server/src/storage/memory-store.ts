import { Injectable } from '@nestjs/common';
import { Player, PlayerAnswer, Reaction, Room } from '../game/types';
import { MAX_REACTIONS, RoomStore } from './store.interface';
import { AnswerEntry, StoredPlayer, StoredRoom, answerField, assembleRoom, baseOf, storedPlayer } from './room-parts';

// Works well enough for local dev and for a single warm Vercel instance.
// For a live event with real traffic across multiple lambda instances,
// prefer KvRoomStore (see kv-store.ts).
@Injectable()
export class MemoryRoomStore implements RoomStore {
  private base: StoredRoom | null = null;
  // By avatar, like KvRoomStore, so an avatar can only be claimed once.
  private players = new Map<string, StoredPlayer>();
  private answers = new Map<string, PlayerAnswer>();
  private reactions: Reaction[] = [];

  // Copies, so changes only stick through the calls below -- as with KvRoomStore.
  async get(): Promise<Room | null> {
    if (!this.base) return null;
    return structuredClone(assembleRoom(this.base, [...this.players.values()], Object.fromEntries(this.answers)));
  }

  async set(room: Room): Promise<void> {
    this.base = structuredClone(baseOf(room));
  }

  async delete(): Promise<void> {
    this.base = null;
    this.players.clear();
    this.answers.clear();
    this.reactions = [];
  }

  async addPlayer(player: Player): Promise<boolean> {
    if (this.players.has(player.avatar)) return false;
    this.players.set(player.avatar, storedPlayer(player));
    return true;
  }

  async addAnswer({ playerId, questionId, answer }: AnswerEntry): Promise<boolean> {
    const field = answerField(playerId, questionId);
    if (this.answers.has(field)) return false;
    this.answers.set(field, structuredClone(answer));
    return true;
  }

  async setAnswers(entries: AnswerEntry[]): Promise<void> {
    for (const { playerId, questionId, answer } of entries) {
      this.answers.set(answerField(playerId, questionId), structuredClone(answer));
    }
  }

  async deleteAnswers(questionId: string, playerIds: string[]): Promise<void> {
    for (const playerId of playerIds) this.answers.delete(answerField(playerId, questionId));
  }

  async addReaction(reaction: Reaction): Promise<void> {
    this.reactions = [...this.reactions, reaction].slice(-MAX_REACTIONS);
  }

  async recentReactions(): Promise<Reaction[]> {
    return this.reactions;
  }
}
