import { Module } from '@nestjs/common';
import { ROOM_STORE } from './store.interface';
import { MemoryRoomStore } from './memory-store';
import { KvRoomStore } from './kv-store';

const hasKv = Boolean(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
);

@Module({
  providers: [
    {
      provide: ROOM_STORE,
      useClass: hasKv ? KvRoomStore : MemoryRoomStore,
    },
  ],
  exports: [ROOM_STORE],
})
export class StorageModule {}
