import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { buildRequireSessionPreHandler } from './auth.guard';
import { AuthService, PlaceholderSessionStore } from './auth.service';
import { registerAuthRoutes } from './auth.routes';

const authModule: FastifyPluginAsync = async (fastify): Promise<void> => {
  const sessionStore = new PlaceholderSessionStore();
  const authService = new AuthService(sessionStore);
  const requireSession = buildRequireSessionPreHandler(authService);

  fastify.decorate('requireSession', requireSession);

  await fastify.register(registerAuthRoutes(fastify.requireSession, authService));
};

export default fp(authModule, {
  name: 'auth-module'
});
