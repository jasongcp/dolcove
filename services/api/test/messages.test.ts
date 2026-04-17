import test from 'node:test';
import assert from 'node:assert/strict';

import type { MessageCreatedEvent } from '@dolcove/shared';

import { MessagesService } from '../src/modules/messages/messages.service';
import { buildApp } from '../src/app';

const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';
const FIRST_PAGE_CURSOR = Buffer.from(
  JSON.stringify({ createdAt: '2026-04-12T00:00:01.000Z', id: 'msg_001' }),
  'utf8'
).toString('base64url');

test('MessagesService lists the first page with deterministic ordering and emits a nextCursor when more rows exist', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const messagesService = new MessagesService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'msg_001',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_a',
            type: 'text',
            text: 'First message',
            media_url: null,
            created_at: '2026-04-12T00:00:01.000Z'
          },
          {
            id: 'msg_002',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_b',
            type: 'text',
            text: 'Second message',
            media_url: null,
            created_at: '2026-04-12T00:00:02.000Z'
          },
          {
            id: 'msg_003',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_c',
            type: 'text',
            text: 'Third message',
            media_url: null,
            created_at: '2026-04-12T00:00:03.000Z'
          }
        ] as T[]
      };
    }
  });

  const result = await messagesService.listMessagesForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token',
    limit: 2
  });

  assert.match(capturedText, /order by m\.created_at asc, m\.id asc/i);
  assert.match(capturedText, /limit \$3/i);
  assert.doesNotMatch(capturedText, /m\.created_at > \$4|m\.created_at = \$4/i);
  assert.deepEqual(capturedValues, ['grp_weekend-crew', 'usr_dev-token', 3]);
  assert.deepEqual(result, {
    items: [
      {
        id: 'msg_001',
        groupId: 'grp_weekend-crew',
        senderId: 'usr_a',
        type: 'text',
        text: 'First message',
        mediaUrl: null,
        createdAt: '2026-04-12T00:00:01.000Z'
      },
      {
        id: 'msg_002',
        groupId: 'grp_weekend-crew',
        senderId: 'usr_b',
        type: 'text',
        text: 'Second message',
        mediaUrl: null,
        createdAt: '2026-04-12T00:00:02.000Z'
      }
    ],
    nextCursor: Buffer.from(
      JSON.stringify({ createdAt: '2026-04-12T00:00:02.000Z', id: 'msg_002' }),
      'utf8'
    ).toString('base64url')
  });
});

test('MessagesService applies cursor filtering for subsequent pages', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const messagesService = new MessagesService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'msg_002',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_b',
            type: 'text',
            text: 'Second message',
            media_url: null,
            created_at: '2026-04-12T00:00:02.000Z'
          }
        ] as T[]
      };
    }
  });

  const result = await messagesService.listMessagesForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token',
    limit: 2,
    cursor: FIRST_PAGE_CURSOR
  });

  assert.match(capturedText, /m\.created_at > \$4/i);
  assert.match(capturedText, /or \(m\.created_at = \$4 and m\.id > \$5\)/i);
  assert.deepEqual(capturedValues, [
    'grp_weekend-crew',
    'usr_dev-token',
    3,
    '2026-04-12T00:00:01.000Z',
    'msg_001'
  ]);
  assert.deepEqual(result, {
    items: [
      {
        id: 'msg_002',
        groupId: 'grp_weekend-crew',
        senderId: 'usr_b',
        type: 'text',
        text: 'Second message',
        mediaUrl: null,
        createdAt: '2026-04-12T00:00:02.000Z'
      }
    ],
    nextCursor: null
  });
});

test('MessagesService rejects malformed cursors with a structured bad request error', async () => {
  const messagesService = new MessagesService({
    async query<T>() {
      return { rows: [] as T[] };
    }
  });

  await assert.rejects(
    () =>
      messagesService.listMessagesForUserInGroup({
        groupId: 'grp_weekend-crew',
        userId: 'usr_dev-token',
        cursor: 'not-a-valid-cursor'
      }),
    /Invalid cursor payload/
  );
});

test('MessagesService fetches a single message only when the authenticated user is a member of the target group', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const messagesService = new MessagesService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'msg_123',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_dev-token',
            type: 'text',
            text: 'Dinner on Friday?',
            media_url: null,
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ] as T[]
      };
    }
  });

  const result = await messagesService.getMessageForUserInGroup({
    groupId: 'grp_weekend-crew',
    messageId: 'msg_123',
    userId: 'usr_dev-token'
  });

  assert.match(capturedText, /from messages m/i);
  assert.match(capturedText, /join group_members gm/i);
  assert.match(capturedText, /where m\.group_id = \$1/i);
  assert.match(capturedText, /and m\.id = \$2/i);
  assert.match(capturedText, /and gm\.user_id = \$3/i);
  assert.deepEqual(capturedValues, ['grp_weekend-crew', 'msg_123', 'usr_dev-token']);
  assert.deepEqual(result, {
    id: 'msg_123',
    groupId: 'grp_weekend-crew',
    senderId: 'usr_dev-token',
    type: 'text',
    text: 'Dinner on Friday?',
    mediaUrl: null,
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('MessagesService returns null when a single message is missing or inaccessible to the authenticated user', async () => {
  const messagesService = new MessagesService({
    async query<T>() {
      return { rows: [] as T[] };
    }
  });

  const result = await messagesService.getMessageForUserInGroup({
    groupId: 'grp_weekend-crew',
    messageId: 'msg_missing',
    userId: 'usr_dev-token'
  });

  assert.equal(result, null);
});

test('MessagesService returns null when listing messages for a group the authenticated user is not a member of', async () => {
  const messagesService = new MessagesService({
    async query<T>() {
      return { rows: [] as T[] };
    }
  });

  const result = await messagesService.listMessagesForUserInGroup({
    groupId: 'grp_private-group',
    userId: 'usr_non_member'
  });

  assert.equal(result, null);
});

test('MessagesService creates a text message only when the authenticated user is a group member and emits a stable message-created event', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  const emittedEvents: MessageCreatedEvent[] = [];

  const messagesService = new MessagesService(
    {
      async query<T>(text: string, values?: readonly unknown[]) {
        queries.push({ text, values });

        if (/insert into messages/i.test(text)) {
          return {
            rows: [
              {
                id: 'msg_11111111-1111-4111-8111-111111111111',
                group_id: 'grp_weekend-crew',
                sender_id: 'usr_dev-token',
                type: 'text',
                text: 'Dinner on Friday?',
                media_url: null,
                created_at: '2026-04-12T00:00:00.000Z'
              }
            ] as T[]
          };
        }

        return { rows: [{ exists: true }] as T[] };
      }
    },
    () => '11111111-1111-4111-8111-111111111111',
    (event) => {
      emittedEvents.push(event);
    }
  );

  const createdMessage = await messagesService.createTextMessageForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token',
    text: 'Dinner on Friday?'
  });

  assert.equal(queries.length, 2);
  assert.match(queries[0].text, /from group_members/i);
  assert.match(queries[0].text, /where group_id = \$1/i);
  assert.match(queries[0].text, /and user_id = \$2/i);
  assert.deepEqual(queries[0].values, ['grp_weekend-crew', 'usr_dev-token']);
  assert.match(queries[1].text, /insert into messages/i);
  assert.deepEqual(queries[1].values, [
    'msg_11111111-1111-4111-8111-111111111111',
    'grp_weekend-crew',
    'usr_dev-token',
    'Dinner on Friday?'
  ]);
  assert.deepEqual(createdMessage, {
    id: 'msg_11111111-1111-4111-8111-111111111111',
    groupId: 'grp_weekend-crew',
    senderId: 'usr_dev-token',
    type: 'text',
    text: 'Dinner on Friday?',
    mediaUrl: null,
    createdAt: '2026-04-12T00:00:00.000Z'
  });
  assert.deepEqual(emittedEvents, [
    {
      type: 'message.created',
      occurredAt: '2026-04-12T00:00:00.000Z',
      payload: {
        messageId: 'msg_11111111-1111-4111-8111-111111111111',
        groupId: 'grp_weekend-crew',
        senderId: 'usr_dev-token',
        createdAt: '2026-04-12T00:00:00.000Z'
      }
    }
  ]);
});

test('MessagesService returns null and emits no event when creating a message for a group the authenticated user is not a member of', async () => {
  const emittedEvents: MessageCreatedEvent[] = [];
  const messagesService = new MessagesService(
    {
      async query<T>() {
        return { rows: [] as T[] };
      }
    },
    undefined,
    (event) => {
      emittedEvents.push(event);
    }
  );

  const result = await messagesService.createTextMessageForUserInGroup({
    groupId: 'grp_private-group',
    userId: 'usr_non_member',
    text: 'Hello'
  });

  assert.equal(result, null);
  assert.deepEqual(emittedEvents, []);
});

test('MessagesService emits no event when message creation fails after membership access succeeds', async () => {
  const emittedEvents: MessageCreatedEvent[] = [];
  const messagesService = new MessagesService(
    {
      async query<T>(text: string) {
        if (/insert into messages/i.test(text)) {
          throw new Error('insert failed');
        }

        return { rows: [{ exists: true }] as T[] };
      }
    },
    () => '11111111-1111-4111-8111-111111111111',
    (event) => {
      emittedEvents.push(event);
    }
  );

  await assert.rejects(
    () =>
      messagesService.createTextMessageForUserInGroup({
        groupId: 'grp_weekend-crew',
        userId: 'usr_dev-token',
        text: 'Dinner on Friday?'
      }),
    /insert failed/
  );

  assert.deepEqual(emittedEvents, []);
});

test('GET /v1/groups/:groupId/messages rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages'
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages rejects malformed cursors with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages?cursor=not-a-valid-cursor',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid message cursor'
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages rejects non-member access with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_private-group/messages',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'GROUP_NOT_FOUND',
      message: 'Group not found'
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages returns the first page without a cursor in stable order', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  let callCount = 0;
  let firstCallValues: unknown[] = [];

  app.db.query = async (_text, values) => {
    callCount += 1;

    if (callCount === 1) {
      firstCallValues = values ?? [];

      return {
        rows: [
          {
            id: 'msg_001',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_a',
            type: 'text',
            text: 'First message',
            media_url: null,
            created_at: '2026-04-12T00:00:01.000Z'
          },
          {
            id: 'msg_002',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_b',
            type: 'text',
            text: 'Second message',
            media_url: null,
            created_at: '2026-04-12T00:00:02.000Z'
          },
          {
            id: 'msg_003',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_c',
            type: 'text',
            text: 'Third message',
            media_url: null,
            created_at: '2026-04-12T00:00:03.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages?limit=2',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(firstCallValues, ['grp_weekend-crew', 'usr_dev-token', 3]);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      items: [
        {
          id: 'msg_001',
          groupId: 'grp_weekend-crew',
          senderId: 'usr_a',
          type: 'text',
          text: 'First message',
          mediaUrl: null,
          createdAt: '2026-04-12T00:00:01.000Z'
        },
        {
          id: 'msg_002',
          groupId: 'grp_weekend-crew',
          senderId: 'usr_b',
          type: 'text',
          text: 'Second message',
          mediaUrl: null,
          createdAt: '2026-04-12T00:00:02.000Z'
        }
      ],
      nextCursor: Buffer.from(
        JSON.stringify({ createdAt: '2026-04-12T00:00:02.000Z', id: 'msg_002' }),
        'utf8'
      ).toString('base64url')
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages returns a subsequent page when a cursor is provided', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  let capturedValues: unknown[] = [];

  app.db.query = async (_text, values) => {
    capturedValues = values ?? [];

    return {
      rows: [
        {
          id: 'msg_002',
          group_id: 'grp_weekend-crew',
          sender_id: 'usr_b',
          type: 'text',
          text: 'Second message',
          media_url: null,
          created_at: '2026-04-12T00:00:02.000Z'
        }
      ]
    };
  };

  const response = await app.inject({
    method: 'GET',
    url: `/v1/groups/grp_weekend-crew/messages?limit=2&cursor=${encodeURIComponent(FIRST_PAGE_CURSOR)}`,
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedValues, [
    'grp_weekend-crew',
    'usr_dev-token',
    3,
    '2026-04-12T00:00:01.000Z',
    'msg_001'
  ]);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      items: [
        {
          id: 'msg_002',
          groupId: 'grp_weekend-crew',
          senderId: 'usr_b',
          type: 'text',
          text: 'Second message',
          mediaUrl: null,
          createdAt: '2026-04-12T00:00:02.000Z'
        }
      ],
      nextCursor: null
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages/:messageId rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages/msg_123'
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages/:messageId returns 404 for missing or inaccessible messages', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages/msg_missing',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found'
    }
  });

  await app.close();
});

test('GET /v1/groups/:groupId/messages/:messageId succeeds for authenticated members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (_text, values) => {
    if (values?.[1] === 'msg_123') {
      return {
        rows: [
          {
            id: 'msg_123',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_dev-token',
            type: 'text',
            text: 'Dinner on Friday?',
            media_url: null,
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/messages/msg_123',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_dev-token',
      type: 'text',
      text: 'Dinner on Friday?',
      mediaUrl: null,
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/messages rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/messages',
    payload: {
      type: 'text',
      text: 'Dinner on Friday?'
    }
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/messages rejects invalid payloads with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  const missingTextResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/messages',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      type: 'text'
    }
  });

  assert.equal(missingTextResponse.statusCode, 400);
  assert.deepEqual(missingTextResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid message payload'
    }
  });

  const blankTextResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/messages',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      type: 'text',
      text: '   '
    }
  });

  assert.equal(blankTextResponse.statusCode, 400);
  assert.deepEqual(blankTextResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid message payload'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/messages rejects non-member access with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_private-group/messages',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      type: 'text',
      text: 'Dinner on Friday?'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'GROUP_NOT_FOUND',
      message: 'Group not found'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/messages succeeds for authenticated members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (text: string) => {
    if (/insert into messages/i.test(text)) {
      return {
        rows: [
          {
            id: 'msg_11111111-1111-4111-8111-111111111111',
            group_id: 'grp_weekend-crew',
            sender_id: 'usr_dev-token',
            type: 'text',
            text: 'Dinner on Friday?',
            media_url: null,
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return { rows: [{ exists: true }] };
  };

  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/messages',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      type: 'text',
      text: 'Dinner on Friday?'
    }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'msg_11111111-1111-4111-8111-111111111111',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_dev-token',
      type: 'text',
      text: 'Dinner on Friday?',
      mediaUrl: null,
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});