import 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Redis } from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    redis: Redis
  }

  interface FastifyRequest {
    userId: string
  }
}
