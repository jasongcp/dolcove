import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AuthService } from './auth.service';

export const buildRequireSessionPreHandler = (authService: AuthService): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const session = await authService.resolveSession(request.headers.authorization);

    if (!session) {
      reply.code(401).send({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });

      return;
    }

    request.auth = {
      session,
      user: session.user
    };
  };
};
