'use client'

import type { MessageDTO } from '@kalehub/types'
import { useSocket } from '@/hooks/useSocket'
import { useConversation } from '@/hooks/useConversation'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface Props {
  conversationId: string
  currentUserId: string
  accessToken: string
  initialMessages: MessageDTO[]
}

export function ChatWindow({
  conversationId,
  currentUserId,
  accessToken,
  initialMessages,
}: Props) {
  const socket = useSocket(accessToken)
  const { messages, sendMessage } = useConversation(socket, conversationId, initialMessages)

  return (
    <div className="flex flex-col flex-1 h-screen">
      <MessageList messages={messages} currentUserId={currentUserId} />
      <MessageInput onSend={(content) => sendMessage(content, accessToken)} />
    </div>
  )
}
