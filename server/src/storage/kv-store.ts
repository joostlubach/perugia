import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { Room } from '../game/types';
import { RoomStore } from './store.interface';

const TTL_SECONDS = 60 * 60 * 12; // rooms auto-expire after 12h

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

  private key(code: string): string {
    return `perugia-quiz:room:${code}`;
  }

  async get(code: string): Promise<Room | null> {
    const room = await this.redis.get<Room>(this.key(code));
    return room ?? null;
  }

  async set(room: Room): Promise<void> {
    await this.redis.set(this.key(room.code), room, { ex: TTL_SECONDS });
  }

  async delete(code: string): Promise<void> {
    await this.redis.del(this.key(code));
  }
}
