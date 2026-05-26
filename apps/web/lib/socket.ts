import type { ClientToServerEvents, ServerToClientEvents } from '@kalehub/types';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/env';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(token: string): AppSocket {
  if (!socket) {
    socket = io(env.NEXT_PUBLIC_WS_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
