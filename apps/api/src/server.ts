import Fastify from 'fastify'
import cors from '@fastify/cors'

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

  app.get('/health', async () => ({ status: 'ok', service: 'api' }))

  return app
}
