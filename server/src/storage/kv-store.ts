import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { Reaction, Room } from '../game/types';
import { MAX_REACTIONS, RoomStore } from './store.interface';

const TTL_SECONDS = 60 * 60 * 12; // the room auto-expires after 12h
const KEY = 'perugia-quiz:room';
const REACTIONS_KEY = 'perugia-quiz:reactions';

// Works with any Vercel Marketplace Redis integration (Upstash) -- these
// set either the legacy KV_REST_API_* vars or the newer UPSTASH_REDIS_REST_*
// vars depending on how the integration was added.
function redisFromEnv(): Redis {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN!;
  return new Redis({ url, token });
}

@Injectable()
export class KvRoomStore implements RoomStore {
  private redis = redisFromEnv();

  async get(): Promise<Room | null> {
    const room = await this.redis.get<Room>(KEY);
    return room ?? null;
  }

  async set(room: Room): Promise<void> {
    await this.redis.set(KEY, room, { ex: TTL_SECONDS });
  }

  async delete(): Promise<void> {
    await this.redis.del(KEY, REACTIONS_KEY);
  }

  async addReaction(reaction: Reaction): Promise<void> {
    await this.redis.lpush(REACTIONS_KEY, reaction);
    await this.redis.ltrim(REACTIONS_KEY, 0, MAX_REACTIONS - 1);
    await this.redis.expire(REACTIONS_KEY, TTL_SECONDS);
  }

  async recentReactions(): Promise<Reaction[]> {
    const newestFirst = await this.redis.lrange<Reaction>(REACTIONS_KEY, 0, MAX_REACTIONS - 1);
    return newestFirst.reverse();
  }
}
