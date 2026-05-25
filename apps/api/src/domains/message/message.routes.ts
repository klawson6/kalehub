import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { MessageService } from './message.service.js'
import { PrismaMessageRepository } from './message.repository.js'
import { PrismaConversationRepository } from '../conversation/conversation.repository.js'
import {
  CreateMessageBody,
  MessageQuerySchema,
  MessagePageSchema,
  MessageSchema,
} from './message.types.js'

const messageRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const service = new MessageService(
    new PrismaMessageRepository(),
    new PrismaConversationRepository(),
  )

  fastify.get(
    '/conversations/:id/messages',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string() }),
        querystring: MessageQuerySchema,
        response: { 200: MessagePageSchema },
      },
    },
    async (request) => {
      return service.list(request.params.id, request.userId, {
        before: request.query.before,
        limit: request.query.limit,
      })
    },
  )

  fastify.post(
    '/conversations/:id/messages',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string() }),
        body: CreateMessageBody,
        response: { 201: MessageSchema },
      },
    },
    async (request, reply) => {
      const message = await service.create(
        request.params.id,
        request.userId,
        request.body.content,
      )

      await fastify.redis.publish(
        `conversation:${request.params.id}`,
        JSON.stringify({
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        }),
      )

      return reply.code(201).send(message)
    },
  )
}

export default messageRoutes
