import type { ClientToServerEvents, MessageDTO, ServerToClientEvents } from '@kalehub/types';
import { Redis } from 'ioredis';
import type { Server } from 'socket.io';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function createRedisSubscriber(redisUrl: string, io: IO): Redis {
  const subscriber = new Redis(redisUrl);

  subscriber.psubscribe('conversation:*').catch((err: unknown) => {
    console.error('[ws] redis psubscribe failed:', err);
  });

  subscriber.on('pmessage', (_pattern: string, channel: string, raw: string) => {
    const conversationId = channel.slice('conversation:'.length);
    try {
      const message = JSON.parse(raw) as MessageDTO;
      io.to(`conversation:${conversationId}`).emit('message:new', message);
    } catch {
      // malformed JSON from Redis — ignore
    }
  });

  return subscriber;
}
