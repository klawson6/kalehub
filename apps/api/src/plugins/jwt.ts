import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

  fastify.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      const auth = request.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      try {
        const { payload } = await jwtVerify(auth.slice(7), secret);
        request.userId = payload.sub as string;
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    },
  );
};

export default fp(jwtPlugin, { name: 'jwt' });
