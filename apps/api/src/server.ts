import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwtPlugin from './plugins/jwt.js'
import userRoutes from './domains/user/user.routes.js'
import conversationRoutes from './domains/conversation/conversation.routes.js'
import { NotFoundError, ForbiddenError, ConflictError } from './shared/errors.js'

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  })

  app.register(cors, {
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })

  app.register(jwtPlugin)

  app.setErrorHandler((error, _request, reply) => {
    if (
      error instanceof NotFoundError ||
      error instanceof ForbiddenError ||
      error instanceof ConflictError
    ) {
      return reply.code(error.statusCode).send({ error: error.message })
    }
    app.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  })

  app.get('/health', async () => ({ status: 'ok', service: 'api' }))

  app.register(userRoutes)
  app.register(conversationRoutes)

  return app
}
