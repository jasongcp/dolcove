import type { ApiResponse, ErrorResponse } from '@dolcove/shared';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';

import { InvalidMessageCursorError, type MessagesService } from './messages.service';
import type { MessageItem, MessageListResult } from './types';

interface MessageParams {
  groupId: string;
  messageId: string;
}

interface GroupParams {
  groupId: string;
}

interface MessagesQuerystring {
  limit?: number;
  cursor?: string;
}

interface CreateMessageBody {
  type: 'text';
  text: string;
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

const messageParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['groupId', 'messageId'],
  properties: {
    groupId: { type: 'string', minLength: 1 },
    messageId: { type: 'string', minLength: 1 }
  }
} as const;

const messagesQuerystringSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    cursor: { type: 'string', minLength: 1 }
  }
} as const;

const messageItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'groupId', 'senderId', 'type', 'text', 'mediaUrl', 'createdAt'],
  properties: {
    id: { type: 'string' },
    groupId: { type: 'string' },
    senderId: { type: 'string' },
    type: { const: 'text' },
    text: { type: 'string' },
    mediaUrl: { type: 'null' },
    createdAt: { type: 'string' }
  }
} as const;

const messageListResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'nextCursor'],
      properties: {
        items: {
          type: 'array',
          items: messageItemSchema
        },
        nextCursor: {
          anyOf: [{ type: 'string' }, { type: 'null' }]
        }
      }
    }
  }
} as const;

const messageResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: messageItemSchema
  }
} as const;

const createMessageBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'text'],
  properties: {
    type: { const: 'text' },
    text: {
      type: 'string',
      minLength: 1,
      pattern: '.*\\S.*'
    }
  }
} as const;

const BAD_REQUEST_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'BAD_REQUEST',
    message: 'Invalid message payload'
  }
};

const INVALID_CURSOR_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'BAD_REQUEST',
    message: 'Invalid message cursor'
  }
};

const GROUP_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'GROUP_NOT_FOUND',
    message: 'Group not found'
  }
};

const MESSAGE_NOT_FOUND_RESPONSE: ErrorResponse = {
  ok: false,
  error: {
    code: 'MESSAGE_NOT_FOUND',
    message: 'Message not found'
  }
};

export const registerMessagesRoutes = (
  requireSession: preHandlerHookHandler,
  messagesService: MessagesService
): FastifyPluginAsync => {
  return async (fastify): Promise<void> => {
    fastify.get(
      '/v1/groups/:groupId/messages',
      {
        preHandler: requireSession,
        attachValidation: true,
        schema: {
          params: groupParamsSchema,
          querystring: messagesQuerystringSchema,
          response: {
            200: messageListResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<MessageListResult> | void> => {
        if (request.validationError) {
          reply.code(400).send(BAD_REQUEST_RESPONSE);
          return;
        }

        const { groupId } = request.params as GroupParams;
        const query = request.query as MessagesQuerystring;

        let result: MessageListResult | null;

        try {
          result = await messagesService.listMessagesForUserInGroup({
            groupId,
            userId: request.auth!.user.userId,
            limit: query.limit,
            cursor: query.cursor ?? null
          });
        } catch (error) {
          if (error instanceof InvalidMessageCursorError) {
            reply.code(400).send(INVALID_CURSOR_RESPONSE);
            return;
          }

          throw error;
        }

        if (!result) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: result
        };
      }
    );

    fastify.get(
      '/v1/groups/:groupId/messages/:messageId',
      {
        preHandler: requireSession,
        schema: {
          params: messageParamsSchema,
          response: {
            200: messageResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<MessageItem> | void> => {
        const { groupId, messageId } = request.params as MessageParams;
        const message = await messagesService.getMessageForUserInGroup({
          groupId,
          messageId,
          userId: request.auth!.user.userId
        });

        if (!message) {
          reply.code(404).send(MESSAGE_NOT_FOUND_RESPONSE);
          return;
        }

        return {
          ok: true,
          data: message
        };
      }
    );

    fastify.post(
      '/v1/groups/:groupId/messages',
      {
        preHandler: requireSession,
        attachValidation: true,
        schema: {
          params: groupParamsSchema,
          body: createMessageBodySchema,
          response: {
            201: messageResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema
          }
        }
      },
      async (request, reply): Promise<ApiResponse<MessageItem> | void> => {
        if (request.validationError) {
          reply.code(400).send(BAD_REQUEST_RESPONSE);
          return;
        }

        const { groupId } = request.params as GroupParams;
        const body = request.body as CreateMessageBody;
        const createdMessage = await messagesService.createTextMessageForUserInGroup({
          groupId,
          userId: request.auth!.user.userId,
          text: body.text.trim()
        });

        if (!createdMessage) {
          reply.code(404).send(GROUP_NOT_FOUND_RESPONSE);
          return;
        }

        reply.code(201);

        return {
          ok: true,
          data: createdMessage
        };
      }
    );
  };
};
