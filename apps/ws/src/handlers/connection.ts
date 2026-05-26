import { prisma } from '@kalehub/db';
import type { ClientToServerEvents, ServerToClientEvents } from '@kalehub/types';
import type { Socket } from 'socket.io';

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { userId: string }
>;

export function registerConnectionHandler(socket: AppSocket) {
  socket.on('conversation:join', async ({ conversationId }) => {
    const count = await prisma.conversationParticipant.count({
      where: { conversationId, userId: socket.data.userId },
    });
    if (count === 0) return;
    await socket.join(`conversation:${conversationId}`);
  });

  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });
}
