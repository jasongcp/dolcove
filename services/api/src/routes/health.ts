import type { HealthStatus } from '@dolcove/shared';
import type { FastifyPluginAsync } from 'fastify';

const healthRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/health', async (): Promise<HealthStatus> => {
    return { status: 'ok' };
  });
};

export default healthRoute;
