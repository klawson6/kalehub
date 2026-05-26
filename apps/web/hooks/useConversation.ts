'use client';

import type { MessageDTO } from '@kalehub/types';
import { useCallback, useEffect, useState } from 'react';

interface ChatSocket {
  emit(event: 'conversation:join', data: { conversationId: string }): void;
  emit(event: 'conversation:leave', data: { conversationId: string }): void;
  on(event: 'message:new', listener: (msg: MessageDTO) => void): void;
  off(event: 'message:new', listener: (msg: MessageDTO) => void): void;
}

export function useConversation(
  socket: ChatSocket,
  conversationId: string,
  initialMessages: MessageDTO[],
) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);

  useEffect(() => {
    socket.emit('conversation:join', { conversationId });

    const onMessage = (msg: MessageDTO) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('message:new', onMessage);

    return () => {
      socket.off('message:new', onMessage);
      socket.emit('conversation:leave', { conversationId });
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    async (content: string, accessToken: string): Promise<void> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) throw new Error('Failed to send message');
    },
    [conversationId],
  );

  return { messages, sendMessage };
}
