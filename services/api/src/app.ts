import Fastify, { type FastifyInstance } from 'fastify';

import authModule from './modules/auth';
import groupsModule from './modules/groups';
import messagesModule from './modules/messages';
import plansModule from './modules/plans';
import recapsModule from './modules/recaps';
import dbPlugin from './plugins/db';
import healthRoute from './routes/health';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true
  });

  await app.register(dbPlugin);
  await app.register(authModule);
  await app.register(groupsModule);
  await app.register(messagesModule);
  await app.register(plansModule);
  await app.register(recapsModule);
  await app.register(healthRoute);

  return app;
};
