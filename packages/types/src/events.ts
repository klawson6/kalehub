import type { MessageDTO } from './message.js';

export interface ServerToClientEvents {
  'message:new': (message: MessageDTO) => void;
}

export interface ClientToServerEvents {
  'conversation:join': (data: { conversationId: string }) => void;
  'conversation:leave': (data: { conversationId: string }) => void;
}
