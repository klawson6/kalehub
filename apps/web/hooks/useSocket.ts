'use client';

import type { ClientToServerEvents, ServerToClientEvents } from '@kalehub/types';
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { disconnectSocket, getSocket } from '@/lib/socket';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(token: string): AppSocket {
  const socketRef = useRef<AppSocket | null>(null);

  if (!socketRef.current) {
    socketRef.current = getSocket(token);
  }

  useEffect(() => {
    const s = socketRef.current;
    if (s && !s.connected) s.connect();

    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}
