'use client'

import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@kalehub/types'
import { getSocket, disconnectSocket } from '@/lib/socket'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket(token: string): AppSocket {
  const socketRef = useRef<AppSocket | null>(null)

  if (!socketRef.current) {
    socketRef.current = getSocket(token)
  }

  useEffect(() => {
    const s = socketRef.current!
    if (!s.connected) s.connect()

    return () => {
      disconnectSocket()
      socketRef.current = null
    }
  }, [])

  return socketRef.current
}
