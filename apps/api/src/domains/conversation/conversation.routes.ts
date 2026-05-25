import type { FastifyPluginAsync } from 'fastify'

const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/conversations', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    return reply.code(201).send({ message: 'Phase 3: not yet implemented' })
  })
}

export default conversationRoutes
