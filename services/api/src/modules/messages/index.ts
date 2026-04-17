import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { registerMessagesRoutes } from './messages.routes';
import { MessagesService } from './messages.service';

const messagesModule: FastifyPluginAsync = async (fastify): Promise<void> => {
  const messagesService = new MessagesService(fastify.db);

  await fastify.register(registerMessagesRoutes(fastify.requireSession, messagesService));
};

export default fp(messagesModule, {
  name: 'messages-module',
  dependencies: ['auth-module']
});
