import type { ApiResponse } from '@dolcove/shared';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';

import type { AuthService } from './auth.service';
import type { AuthMeResponseData } from './types';

const authMeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'displayName', 'email', 'avatarUrl', 'createdAt'],
      properties: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        email: { type: ['string', 'null'] },
        avatarUrl: { type: ['string', 'null'] },
        createdAt: { type: 'string' }
      }
    }
  }
} as const;

const unauthorizedResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'error'],
  properties: {
    ok: { const: false },
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
} as const;

export const registerAuthRoutes = (
  requireSession: preHandlerHookHandler,
  authService: AuthService
): FastifyPluginAsync => {
  return async (fastify): Promise<void> => {
    fastify.get(
      '/v1/auth/me',
      {
        preHandler: requireSession,
        schema: {
          response: {
            200: authMeResponseSchema,
            401: unauthorizedResponseSchema
          }
        }
      },
      async (request): Promise<ApiResponse<AuthMeResponseData>> => {
        const identity = authService.buildAuthenticatedIdentity(request.auth!.user);

        return {
          ok: true,
          data: identity
        };
      }
    );
  };
};
