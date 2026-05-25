import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConversation } from './useConversation'
import type { MessageDTO } from '@kalehub/types'

function makeSocket() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {}
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      listeners[event] ??= []
      listeners[event]!.push(fn)
    }),
    off: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((l) => l !== fn)
    }),
    _emit: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach((fn) => fn(...args))
    },
  }
}

const makeMessage = (id: string): MessageDTO => ({
  id,
  conversationId: 'conv-1',
  senderId: 'user-b',
  content: `Message ${id}`,
  createdAt: new Date().toISOString(),
  editedAt: null,
})

const initial: MessageDTO[] = [makeMessage('msg-0')]

describe('useConversation', () => {
  let socket: ReturnType<typeof makeSocket>

  beforeEach(() => {
    socket = makeSocket()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('emits conversation:join on mount', () => {
    renderHook(() => useConversation(socket, 'conv-1', initial))

    expect(socket.emit).toHaveBeenCalledWith('conversation:join', { conversationId: 'conv-1' })
  })

  it('initialises messages from the initial prop', () => {
    const { result } = renderHook(() => useConversation(socket, 'conv-1', initial))

    expect(result.current.messages).toEqual(initial)
  })

  it('appends incoming message:new events to the list', async () => {
    const { result } = renderHook(() => useConversation(socket, 'conv-1', initial))
    const incoming = makeMessage('msg-live')

    act(() => {
      socket._emit('message:new', incoming)
    })

    expect(result.current.messages).toEqual([...initial, incoming])
  })

  it('does not cross-contaminate events between separate renders', async () => {
    const { result: r1 } = renderHook(() => useConversation(socket, 'conv-1', []))
    const { result: r2 } = renderHook(() => useConversation(socket, 'conv-1', []))
    const msg = makeMessage('msg-x')

    act(() => {
      socket._emit('message:new', msg)
    })

    expect(r1.current.messages).toEqual([msg])
    expect(r2.current.messages).toEqual([msg])
  })

  it('emits conversation:leave and unregisters listener on unmount', () => {
    const { unmount } = renderHook(() => useConversation(socket, 'conv-1', initial))

    unmount()

    expect(socket.off).toHaveBeenCalledWith('message:new', expect.any(Function))
    expect(socket.emit).toHaveBeenCalledWith('conversation:leave', { conversationId: 'conv-1' })
  })

  it('sendMessage POSTs to the API with the correct headers', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 201 }))
    const { result } = renderHook(() => useConversation(socket, 'conv-1', initial))

    await act(async () => {
      await result.current.sendMessage('Hello', 'test-token')
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/conv-1/messages'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ content: 'Hello' }),
      }),
    )
  })

  it('sendMessage throws when the API returns an error', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))
    const { result } = renderHook(() => useConversation(socket, 'conv-1', initial))

    await expect(
      act(async () => {
        await result.current.sendMessage('Hello', 'test-token')
      }),
    ).rejects.toThrow('Failed to send message')
  })
})
