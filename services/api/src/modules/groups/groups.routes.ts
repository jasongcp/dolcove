import type { ApiResponse, ErrorResponse } from '@dolcove/shared';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';

import type { GroupsService } from './groups.service';
import type { CreatedGroupRecord, GroupDetail, GroupListItem } from './types';

interface CreateGroupBody {
  name: string;
  description?: string | null;
}

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

const groupListItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'description', 'memberCount', 'lastActivityAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    memberCount: { type: 'integer' },
    lastActivityAt: { type: 'string' }
  }
} as const;

const groupDetailSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'description', 'memberCount', 'createdBy', 'createdAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    memberCount: { type: 'integer' },
    createdBy: { type: 'string' },
    createdAt: { type: 'string' }
  }
} as const;

const createdGroupSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'description', 'createdBy', 'createdAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    createdBy: { type: 'string' },
    createdAt: { type: 'string' }
  }
} as const;

const okGroupListResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'array',
      items: groupListItemSchema
    }
  }
} as const;

const okGroupDetailResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: groupDetailSchema
  }
} as const;

const okCreatedGroupResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: createdGroupSchema
  }
} as const;

const createGroupBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      pattern: '.*\\S.*'
    },
    description: {
      anyOf: [{ type: 'string' }, { type: 'null' }]
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

const BAD_REQUEST_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'BAD_REQUEST',
    message: 'Invalid group payload'
  }
};

const GROUP_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'GROUP_NOT_FOUND',
    message: 'Group not found'
  }
};

export const registerGroupsRoutes = (
  requireSession: preHandlerHookHandler,
  groupsService: GroupsService
): FastifyPluginAsync => {
  return async (fastify): Promise<void> => {
    fastify.get(
      '/v1/groups',
      {
        preHandler: requireSession,
        schema: {
          response: {
            200: okGroupListResponseSchema,
            401: errorResponseSchema
          }
        }
      },
      async (request): Promise<ApiResponse<GroupListItem[]>> => {
        const groups = await groupsService.listGroupsForUser(request.auth!.user.userId);

        return {
          ok: true,
          data: groups
        };
      }
    );

    fastify.post(
      '/v1/groups',
      {
        preHandler: requireSession,
        attachValidation: true,
        schema: {
          body: createGroupBodySchema,
          response: {
            201: okCreatedGroupResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<CreatedGroupRecord> | void> => {
        if (request.validationError) {
          reply.code(400).send(BAD_REQUEST_RESPONSE);
          return;
        }

        const body = request.body as CreateGroupBody;

        if (
          body.description !== undefined &&
          body.description !== null &&
          typeof body.description !== 'string'
        ) {
          reply.code(400).send(BAD_REQUEST_RESPONSE);
          return;
        }

        const createdGroup = await groupsService.createGroup({
          userId: request.auth!.user.userId,
          name: body.name.trim(),
          description:
            typeof body.description === 'string' && body.description.trim().length > 0
              ? body.description.trim()
              : null
        });

        reply.code(201);

        return {
          ok: true,
          data: createdGroup
        };
      }
    );

    fastify.get(
      '/v1/groups/:groupId',
      {
        preHandler: requireSession,
        schema: {
          params: groupParamsSchema,
          response: {
            200: okGroupDetailResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<GroupDetail> | void> => {
        const { groupId } = request.params as GroupParams;
        const group = await groupsService.getGroupForUser(groupId, request.auth!.user.userId);

        if (!group) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: group
        };
      }
    );
  };
};
