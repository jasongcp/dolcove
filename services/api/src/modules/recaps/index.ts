import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { registerRecapsRoutes } from './recaps.routes';
import { RecapsService } from './recaps.service';

const recapsModule: FastifyPluginAsync = async (fastify): Promise<void> => {
  const recapsService = new RecapsService(fastify.db);

  await fastify.register(registerRecapsRoutes(fastify.requireSession, recapsService));
};

export default fp(recapsModule, {
  name: 'recaps-module',
  dependencies: ['auth-module']
});
