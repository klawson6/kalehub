import type { FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../shared/errors.js';
import { PrismaUserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new UserService(new PrismaUserRepository());

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await service.getById(request.userId);
    if (!user) throw new NotFoundError('User', request.userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  });
};

export default userRoutes;
