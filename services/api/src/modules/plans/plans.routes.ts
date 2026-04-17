import type { ApiResponse, ErrorResponse, Plan, PlanVote } from '@dolcove/shared';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';

import type { PlansService } from './plans.service';

interface GroupParams {
  groupId: string;
}

interface PlanParams {
  planId: string;
}

interface CreatePlanBody {
  title: string;
  description?: string | null;
  startTime?: string | null;
  location?: string | null;
}

interface VoteBody {
  vote: PlanVote['vote'];
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

const planParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['planId'],
  properties: {
    planId: { type: 'string', minLength: 1 }
  }
} as const;

const planSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'groupId',
    'title',
    'description',
    'status',
    'startTime',
    'location',
    'createdBy',
    'createdAt'
  ],
  properties: {
    id: { type: 'string' },
    groupId: { type: 'string' },
    title: { type: 'string' },
    description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    status: { enum: ['proposed', 'confirmed', 'cancelled', 'completed'] },
    startTime: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    createdBy: { type: 'string' },
    createdAt: { type: 'string' }
  }
} as const;

const planVoteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'planId', 'userId', 'vote', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    planId: { type: 'string' },
    userId: { type: 'string' },
    vote: { enum: ['yes', 'no', 'maybe'] },
    updatedAt: { type: 'string' }
  }
} as const;

const createPlanBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title'],
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      pattern: '.*\\S.*'
    },
    description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    startTime: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    location: { anyOf: [{ type: 'string' }, { type: 'null' }] }
  }
} as const;

const voteBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['vote'],
  properties: {
    vote: { enum: ['yes', 'no', 'maybe'] }
  }
} as const;

const planListResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'array',
      items: planSchema
    }
  }
} as const;

const planResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: planSchema
  }
} as const;

const planVoteResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: planVoteSchema
  }
} as const;

const INVALID_PLAN_PAYLOAD_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'BAD_REQUEST',
    message: 'Invalid plan payload'
  }
};

const INVALID_PLAN_VOTE_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'BAD_REQUEST',
    message: 'Invalid plan vote payload'
  }
};

const GROUP_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'GROUP_NOT_FOUND',
    message: 'Group not found'
  }
};

const PLAN_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'PLAN_NOT_FOUND',
    message: 'Plan not found'
  }
};

export const registerPlansRoutes = (
  requireSession: preHandlerHookHandler,
  plansService: PlansService
): FastifyPluginAsync => {
  return async (fastify): Promise<void> => {
    fastify.get(
      '/v1/groups/:groupId/plans',
      {
        preHandler: requireSession,
        schema: {
          params: groupParamsSchema,
          response: {
            200: planListResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<Plan[]> | void> => {
        const { groupId } = request.params as GroupParams;
        const plans = await plansService.listPlansForUserInGroup({
          groupId,
          userId: request.auth!.user.userId
        });

        if (!plans) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: plans
        };
      }
    );

    fastify.get(
      '/v1/plans/:planId',
      {
        preHandler: requireSession,
        schema: {
          params: planParamsSchema,
          response: {
            200: planResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<Plan> | void> => {
        const { planId } = request.params as PlanParams;
        const plan = await plansService.getPlanForUser({
          planId,
          userId: request.auth!.user.userId
        });

        if (!plan) {
          reply.code(404).send(PLAN_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: plan
        };
      }
    );

    fastify.post(
      '/v1/groups/:groupId/plans',
      {
        preHandler: requireSession,
        attachValidation: true,
        schema: {
          params: groupParamsSchema,
          body: createPlanBodySchema,
          response: {
            201: planResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<Plan> | void> => {
        if (request.validationError) {
          reply.code(400).send(INVALID_PLAN_PAYLOAD_RESPONSE);
          return;
        }

        const { groupId } = request.params as GroupParams;
        const body = request.body as CreatePlanBody;
        const createdPlan = await plansService.createPlan({
          groupId,
          userId: request.auth!.user.userId,
          title: body.title.trim(),
          description: body.description ?? null,
          startTime: body.startTime ?? null,
          location: body.location ?? null
        });

        if (!createdPlan) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        reply.code(201);

        return {
          ok: true,
          data: createdPlan
        };
      }
    );

    fastify.post(
      '/v1/plans/:planId/votes',
      {
        preHandler: requireSession,
        attachValidation: true,
        schema: {
          params: planParamsSchema,
          body: voteBodySchema,
          response: {
            200: planVoteResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<PlanVote> | void> => {
        if (request.validationError) {
          reply.code(400).send(INVALID_PLAN_VOTE_RESPONSE);
          return;
        }

        const { planId } = request.params as PlanParams;
        const body = request.body as VoteBody;
        const savedVote = await plansService.voteOnPlan({
          planId,
          userId: request.auth!.user.userId,
          vote: body.vote
        });

        if (!savedVote) {
          reply.code(404).send(PLAN_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: savedVote
        };
      }
    );
  };
};
