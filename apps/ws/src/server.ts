import { createServer } from 'node:http'
import { Server } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@kalehub/types'

export function buildServer() {
  const httpServer = createServer((_req, res) => {
    if (_req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'ws' }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
      credentials: true,
    },
  })

  return { httpServer, io }
}
