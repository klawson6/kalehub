import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Redis } from 'ioredis';

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  fastify.decorate('redis', redis);
  fastify.addHook('onClose', () => redis.quit());
};

export default fp(redisPlugin, { name: 'redis' });
