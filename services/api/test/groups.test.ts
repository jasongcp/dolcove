import test from 'node:test';
import assert from 'node:assert/strict';

import { GroupsService } from '../src/modules/groups/groups.service';
import { buildApp } from '../src/app';

const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';

test('GroupsService fetches groups for the authenticated user from Postgres without depending on messages', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const groupsService = new GroupsService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'grp_weekend-crew',
            name: 'Weekend Crew',
            description: 'Close friends planning dinners and trips',
            member_count: 4,
            last_activity_at: '2026-04-12T00:00:00.000Z'
          }
        ] as T[]
      };
    },
    async connect() {
      throw new Error('not used');
    }
  });

  const groups = await groupsService.listGroupsForUser('usr_dev-token');

  assert.match(capturedText, /from groups/i);
  assert.match(capturedText, /join group_members/i);
  assert.match(capturedText, /where gm\.user_id = \$1/i);
  assert.doesNotMatch(capturedText, /join messages|from messages|max\(m\.created_at\)|m\.created_at/i);
  assert.deepEqual(capturedValues, ['usr_dev-token']);
  assert.deepEqual(groups, [
    {
      id: 'grp_weekend-crew',
      name: 'Weekend Crew',
      description: 'Close friends planning dinners and trips',
      memberCount: 4,
      lastActivityAt: '2026-04-12T00:00:00.000Z'
    }
  ]);
});

test('GroupsService fetches a single group detail only when the authenticated user is a member', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const groupsService = new GroupsService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'grp_weekend-crew',
            name: 'Weekend Crew',
            description: 'Close friends planning dinners and trips',
            member_count: 4,
            created_by: 'usr_dev-token',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ] as T[]
      };
    },
    async connect() {
      throw new Error('not used');
    }
  });

  const group = await groupsService.getGroupForUser('grp_weekend-crew', 'usr_dev-token');

  assert.match(capturedText, /from groups/i);
  assert.match(capturedText, /join group_members/i);
  assert.match(capturedText, /where g\.id = \$1/i);
  assert.match(capturedText, /and gm\.user_id = \$2/i);
  assert.deepEqual(capturedValues, ['grp_weekend-crew', 'usr_dev-token']);
  assert.deepEqual(group, {
    id: 'grp_weekend-crew',
    name: 'Weekend Crew',
    description: 'Close friends planning dinners and trips',
    memberCount: 4,
    createdBy: 'usr_dev-token',
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('GroupsService returns null for group detail when membership-filtered query finds no row', async () => {
  const groupsService = new GroupsService({
    async query<T>() {
      return { rows: [] as T[] };
    },
    async connect() {
      throw new Error('not used');
    }
  });

  const group = await groupsService.getGroupForUser('grp_unknown', 'usr_non_member');

  assert.equal(group, null);
});

test('GroupsService creates a group and owner membership inside a transaction with unique ids', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let released = false;

  const groupsService = new GroupsService(
    {
      async query<T>() {
        return { rows: [] as T[] };
      },
      async connect() {
        return {
          async query<T>(text: string, values?: readonly unknown[]) {
            queries.push({ text, values });

            if (/insert into groups/i.test(text)) {
              return {
                rows: [
                  {
                    id: 'grp_11111111-1111-4111-8111-111111111111',
                    name: 'Test Group',
                    description: 'Planning dinners',
                    created_by: 'usr_dev-token',
                    created_at: '2026-04-12T00:00:00.000Z'
                  }
                ] as T[]
              };
            }

            return {
              rows: [] as T[]
            };
          },
          release() {
            released = true;
          }
        };
      }
    },
    () => '11111111-1111-4111-8111-111111111111'
  );

  const createdGroup = await groupsService.createGroup({
    userId: 'usr_dev-token',
    name: 'Test Group',
    description: 'Planning dinners'
  });

  assert.equal(queries.length, 4);
  assert.match(queries[0].text, /^BEGIN$/i);
  assert.match(queries[1].text, /insert into groups/i);
  assert.deepEqual(queries[1].values?.slice(0, 4), [
    'grp_11111111-1111-4111-8111-111111111111',
    'Test Group',
    'Planning dinners',
    'usr_dev-token'
  ]);
  assert.match(queries[2].text, /insert into group_members/i);
  assert.deepEqual(queries[2].values?.slice(0, 4), [
    'gm_11111111-1111-4111-8111-111111111111',
    'grp_11111111-1111-4111-8111-111111111111',
    'usr_dev-token',
    'owner'
  ]);
  assert.match(queries[3].text, /^COMMIT$/i);
  assert.equal(released, true);
  assert.deepEqual(createdGroup, {
    id: 'grp_11111111-1111-4111-8111-111111111111',
    name: 'Test Group',
    description: 'Planning dinners',
    createdBy: 'usr_dev-token',
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('POST /v1/groups rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups',
    payload: {
      name: 'Test Group',
      description: 'Planning dinners'
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

test('POST /v1/groups rejects invalid payloads with a structured error from schema validation', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  const missingNameResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      description: 'Planning dinners'
    }
  });

  assert.equal(missingNameResponse.statusCode, 400);
  assert.deepEqual(missingNameResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid group payload'
    }
  });

  const emptyNameResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      name: '   '
    }
  });

  assert.equal(emptyNameResponse.statusCode, 400);
  assert.deepEqual(emptyNameResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid group payload'
    }
  });

  await app.close();
});

test('POST /v1/groups succeeds for authenticated requests with valid input', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  app.db.connect = async () => {
    return {
      async query(text: string) {
        if (/insert into groups/i.test(text)) {
          return {
            rows: [
              {
                id: 'grp_11111111-1111-4111-8111-111111111111',
                name: 'Test Group',
                description: 'Planning dinners',
                created_by: 'usr_dev-token',
                created_at: '2026-04-12T00:00:00.000Z'
              }
            ]
          };
        }

        return { rows: [] };
      },
      release() {}
    } as never;
  };

  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      name: 'Test Group',
      description: 'Planning dinners'
    }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'grp_11111111-1111-4111-8111-111111111111',
      name: 'Test Group',
      description: 'Planning dinners',
      createdBy: 'usr_dev-token',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('GET /v1/groups rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups'
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

test('GET /v1/groups/:groupId rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew'
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

test('GET /v1/groups/:groupId rejects non-member access with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  app.db.query = async () => {
    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_private-group',
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

test('GET /v1/groups/:groupId succeeds for authenticated members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  app.db.query = async (_text, values) => {
    if (values?.[0] === 'grp_weekend-crew') {
      return {
        rows: [
          {
            id: 'grp_weekend-crew',
            name: 'Weekend Crew',
            description: 'Close friends planning dinners and trips',
            member_count: 4,
            created_by: 'usr_dev-token',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return {
      rows: [
        {
          id: 'grp_weekend-crew',
          name: 'Weekend Crew',
          description: 'Close friends planning dinners and trips',
          member_count: 4,
          last_activity_at: '2026-04-12T00:00:00.000Z'
        }
      ]
    };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'grp_weekend-crew',
      name: 'Weekend Crew',
      description: 'Close friends planning dinners and trips',
      memberCount: 4,
      createdBy: 'usr_dev-token',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('GET /v1/groups passes the authenticated user id into the DB query as $1', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  let capturedValues: unknown[] = [];

  app.db.query = async (_text, values) => {
    capturedValues = [...(values ?? [])];

    return {
      rows: [
        {
          id: 'grp_weekend-crew',
          name: 'Weekend Crew',
          description: 'Close friends planning dinners and trips',
          member_count: 4,
          last_activity_at: '2026-04-12T00:00:00.000Z'
        }
      ]
    };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedValues, ['usr_dev-token']);

  await app.close();
});

test('GET /v1/groups returns the stable groups list envelope for authenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  app.db.query = async () => {
    return {
      rows: [
        {
          id: 'grp_weekend-crew',
          name: 'Weekend Crew',
          description: 'Close friends planning dinners and trips',
          member_count: 4,
          last_activity_at: '2026-04-12T00:00:00.000Z'
        }
      ]
    };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: [
      {
        id: 'grp_weekend-crew',
        name: 'Weekend Crew',
        description: 'Close friends planning dinners and trips',
        memberCount: 4,
        lastActivityAt: '2026-04-12T00:00:00.000Z'
      }
    ]
  });

  await app.close();
});
