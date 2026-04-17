import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { registerPlansRoutes } from './plans.routes';
import { PlansService } from './plans.service';

const plansModule: FastifyPluginAsync = async (fastify): Promise<void> => {
  const plansService = new PlansService(fastify.db);

  await fastify.register(registerPlansRoutes(fastify.requireSession, plansService));
};

export default fp(plansModule, {
  name: 'plans-module',
  dependencies: ['auth-module']
});
