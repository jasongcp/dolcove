const fastify = require('fastify')({ logger: true });

fastify.get('/health', async () => {
  return { status: 'ok' };
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
