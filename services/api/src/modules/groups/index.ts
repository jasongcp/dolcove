import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { registerGroupsRoutes } from './groups.routes';
import { GroupsService } from './groups.service';

const groupsModule: FastifyPluginAsync = async (fastify): Promise<void> => {
  const groupsService = new GroupsService(fastify.db);

  await fastify.register(registerGroupsRoutes(fastify.requireSession, groupsService));
};

export default fp(groupsModule, {
  name: 'groups-module',
  dependencies: ['auth-module']
});
