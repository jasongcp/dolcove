import type { ApiResponse, ErrorResponse, Recap } from '@dolcove/shared';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';

import type { RecapsService } from './recaps.service';

interface GroupParams {
  groupId: string;
}

const errorResponseSchema = {
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

const groupParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['groupId'],
  properties: {
    groupId: { type: 'string', minLength: 1 }
  }
} as const;

const recapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'groupId', 'periodStart', 'periodEnd', 'content', 'createdAt'],
  properties: {
    id: { type: 'string' },
    groupId: { type: 'string' },
    periodStart: { type: 'string' },
    periodEnd: { type: 'string' },
    content: { type: 'string' },
    createdAt: { type: 'string' }
  }
} as const;

const recapListResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'array',
      items: recapSchema
    }
  }
} as const;

const GROUP_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'GROUP_NOT_FOUND',
    message: 'Group not found'
  }
};

export const registerRecapsRoutes = (
  requireSession: preHandlerHookHandler,
  recapsService: RecapsService
): FastifyPluginAsync => {
  return async (fastify): Promise<void> => {
    fastify.get(
      '/v1/groups/:groupId/recaps',
      {
        preHandler: requireSession,
        schema: {
          params: groupParamsSchema,
          response: {
            200: recapListResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<Recap[]> | void> => {
        const { groupId } = request.params as GroupParams;
        const recaps = await recapsService.listRecapsForUserInGroup({
          groupId,
          userId: request.auth!.user.userId
        });

        if (!recaps) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: recaps
        };
      }
    );
  };
};
