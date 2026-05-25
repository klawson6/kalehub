import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerConnectionHandler } from './connection.js'

vi.mock('@kalehub/db', () => ({
  prisma: {
    conversationParticipant: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@kalehub/db'

function makeSocket(userId = 'user-a') {
  return {
    data: { userId },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      // store handlers by event for test invocation
      socket._handlers[event] = handler
    }),
    join: vi.fn(),
    leave: vi.fn(),
    _handlers: {} as Record<string, (...args: unknown[]) => void>,
  }
}

let socket: ReturnType<typeof makeSocket>

beforeEach(() => {
  socket = makeSocket()
  vi.mocked(prisma.conversationParticipant.count).mockReset()
  registerConnectionHandler(socket as never)
})

describe('registerConnectionHandler', () => {
  describe('conversation:join', () => {
    it('joins the room when user is a participant', async () => {
      vi.mocked(prisma.conversationParticipant.count).mockResolvedValue(1)

      await socket._handlers['conversation:join']!({ conversationId: 'conv-1' })

      expect(prisma.conversationParticipant.count).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1', userId: 'user-a' },
      })
      expect(socket.join).toHaveBeenCalledWith('conversation:conv-1')
    })

    it('does not join when user is not a participant', async () => {
      vi.mocked(prisma.conversationParticipant.count).mockResolvedValue(0)

      await socket._handlers['conversation:join']!({ conversationId: 'conv-1' })

      expect(socket.join).not.toHaveBeenCalled()
    })
  })

  describe('conversation:leave', () => {
    it('leaves the room', () => {
      socket._handlers['conversation:leave']!({ conversationId: 'conv-1' })

      expect(socket.leave).toHaveBeenCalledWith('conversation:conv-1')
    })
  })
})
