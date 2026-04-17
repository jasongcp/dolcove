import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fp(dbPlugin, {
  name: 'db'
});
