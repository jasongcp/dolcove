import type { SessionUser } from '@dolcove/shared';
import type { preHandlerHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requireSession: preHandlerHookHandler;
  }

  interface FastifyRequest {
    auth?: {
      session: Session;
      user: SessionUser;
    };
  }
}

export interface Session {
  token: string;
  user: SessionUser;
}

export interface AuthMeResponseData {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
