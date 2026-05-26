import { createServer } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents } from '@kalehub/types';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { jwtVerify } from 'jose';
import { Server } from 'socket.io';
import { registerConnectionHandler } from './handlers/connection.js';
import { createRedisSubscriber } from './lib/redis-subscriber.js';

type SocketData = { userId: string };

export function buildServer() {
  const httpServer = createServer((_req, res) => {
    if (_req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'ws' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true },
  });

  const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const pubClient = new Redis(REDIS_URL);
  const adapterSub = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, adapterSub));

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const { payload } = await jwtVerify(token, secret);
      socket.data.userId = payload.sub as string;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  createRedisSubscriber(REDIS_URL, io);
  io.on('connection', (socket) => {
    registerConnectionHandler(socket);
  });

  return { httpServer, io };
}
