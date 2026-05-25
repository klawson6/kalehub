import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { ConversationService } from './conversation.service.js'
import { PrismaConversationRepository } from './conversation.repository.js'
import { PrismaUserRepository } from '../user/user.repository.js'
import { CreateConversationBody, ConversationSchema } from './conversation.types.js'
import { NotFoundError } from '../../shared/errors.js'

const conversationRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const service = new ConversationService(
    new PrismaConversationRepository(),
    new PrismaUserRepository(),
  )

  fastify.get(
    '/conversations',
    {
      preHandler: [fastify.authenticate],
      schema: { response: { 200: z.array(ConversationSchema) } },
    },
    async (request) => {
      return service.listForUser(request.userId)
    },
  )

  fastify.post(
    '/conversations',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: CreateConversationBody,
        response: { 201: ConversationSchema },
      },
    },
    async (request, reply) => {
      const conversation = await service.create(request.userId, request.body)
      return reply.code(201).send(conversation)
    },
  )

  fastify.get(
    '/conversations/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ConversationSchema },
      },
    },
    async (request) => {
      const conversation = await service.listForUser(request.userId).then((list) =>
        list.find((c) => c.id === request.params.id),
      )
      if (!conversation) throw new NotFoundError('Conversation', request.params.id)
      return conversation
    },
  )
}

export default conversationRoutes
