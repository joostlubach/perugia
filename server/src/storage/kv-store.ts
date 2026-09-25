import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { Player, PlayerAnswer, Reaction, Room } from '../game/types';
import { MAX_REACTIONS, RoomStore } from './store.interface';
import { AnswerEntry, StoredPlayer, StoredRoom, answerField, assembleRoom, baseOf, storedPlayer } from './room-parts';

const TTL_SECONDS = 60 * 60 * 12; // the room auto-expires after 12h
const KEY = 'perugia-quiz:room';
// Hash of players by avatar, so HSETNX claims an avatar atomically.
const PLAYERS_KEY = 'perugia-quiz:players';
// Hash of answers by "playerId:questionId", so HSETNX takes only the first answer.
const ANSWERS_KEY = 'perugia-quiz:answers';
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
    const [base, players, answers] = await this.redis
      .pipeline()
      .get<StoredRoom>(KEY)
      .hgetall<Record<string, StoredPlayer>>(PLAYERS_KEY)
      .hgetall<Record<string, PlayerAnswer>>(ANSWERS_KEY)
      .exec<[StoredRoom | null, Record<string, StoredPlayer> | null, Record<string, PlayerAnswer> | null]>();
    if (!base) return null;
    return assembleRoom(base, Object.values(players ?? {}), answers ?? {});
  }

  async set(room: Room): Promise<void> {
    await this.redis.set(KEY, baseOf(room), { ex: TTL_SECONDS });
  }

  async delete(): Promise<void> {
    await this.redis.del(KEY, PLAYERS_KEY, ANSWERS_KEY, REACTIONS_KEY);
  }

  async addPlayer(player: Player): Promise<boolean> {
    const [added] = await this.redis
      .pipeline()
      .hsetnx(PLAYERS_KEY, player.avatar, storedPlayer(player))
      .expire(PLAYERS_KEY, TTL_SECONDS)
      .exec<[number, number]>();
    return added === 1;
  }

  async addAnswer({ playerId, questionId, answer }: AnswerEntry): Promise<boolean> {
    const [added] = await this.redis
      .pipeline()
      .hsetnx(ANSWERS_KEY, answerField(playerId, questionId), answer)
      .expire(ANSWERS_KEY, TTL_SECONDS)
      .exec<[number, number]>();
    return added === 1;
  }

  async setAnswers(entries: AnswerEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const fields = Object.fromEntries(entries.map((e) => [answerField(e.playerId, e.questionId), e.answer]));
    await this.redis.pipeline().hset(ANSWERS_KEY, fields).expire(ANSWERS_KEY, TTL_SECONDS).exec();
  }

  async deleteAnswers(questionId: string, playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;
    await this.redis.hdel(ANSWERS_KEY, ...playerIds.map((id) => answerField(id, questionId)));
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
