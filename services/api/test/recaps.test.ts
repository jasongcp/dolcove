import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApp } from '../src/app';
import { RecapsService } from '../src/modules/recaps/recaps.service';

const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';

test('RecapsService lists recaps only for groups the authenticated user is a member of', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const recapsService = new RecapsService({
    async query<T>(text: string, values?: readonly unknown[]) {
      capturedText = text;
      capturedValues = [...(values ?? [])];

      return {
        rows: [
          {
            id: 'rcp_weekly-001',
            group_id: 'grp_weekend-crew',
            period_start: '2026-04-05T00:00:00.000Z',
            period_end: '2026-04-12T00:00:00.000Z',
            content: 'This week the group discussed Friday dinner.',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ] as T[]
      };
    }
  });

  const recaps = await recapsService.listRecapsForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token'
  });

  assert.match(capturedText, /from recaps r/i);
  assert.match(capturedText, /join group_members gm/i);
  assert.match(capturedText, /where r\.group_id = \$1/i);
  assert.match(capturedText, /and gm\.user_id = \$2/i);
  assert.match(capturedText, /order by r\.period_start desc, r\.id desc/i);
  assert.deepEqual(capturedValues, ['grp_weekend-crew', 'usr_dev-token']);
  assert.deepEqual(recaps, [
    {
      id: 'rcp_weekly-001',
      groupId: 'grp_weekend-crew',
      periodStart: '2026-04-05T00:00:00.000Z',
      periodEnd: '2026-04-12T00:00:00.000Z',
      content: 'This week the group discussed Friday dinner.',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  ]);
});

test('RecapsService returns an empty list when the authenticated user is a member but the group has no recaps', async () => {
  let queryCount = 0;

  const recapsService = new RecapsService({
    async query<T>(text: string) {
      queryCount += 1;

      if (/from recaps r/i.test(text)) {
        return { rows: [] as T[] };
      }

      return { rows: [{ exists: true }] as T[] };
    }
  });

  const recaps = await recapsService.listRecapsForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token'
  });

  assert.equal(queryCount, 2);
  assert.deepEqual(recaps, []);
});

test('RecapsService returns null when the authenticated user cannot access the group', async () => {
  const recapsService = new RecapsService({
    async query<T>() {
      return { rows: [] as T[] };
    }
  });

  const recaps = await recapsService.listRecapsForUserInGroup({
    groupId: 'grp_private-group',
    userId: 'usr_non_member'
  });

  assert.equal(recaps, null);
});

test('GET /v1/groups/:groupId/recaps rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/recaps'
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

test('GET /v1/groups/:groupId/recaps returns 404 for inaccessible groups', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_private-group/recaps',
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

test('GET /v1/groups/:groupId/recaps returns an empty list for authenticated members when no recaps exist', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (text: string) => {
    if (/from recaps r/i.test(text)) {
      return { rows: [] };
    }

    return { rows: [{ exists: true }] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/recaps',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: []
  });

  await app.close();
});

test('GET /v1/groups/:groupId/recaps returns a recap list for authenticated members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (text: string) => {
    if (/from recaps r/i.test(text)) {
      return {
        rows: [
          {
            id: 'rcp_weekly-001',
            group_id: 'grp_weekend-crew',
            period_start: '2026-04-05T00:00:00.000Z',
            period_end: '2026-04-12T00:00:00.000Z',
            content: 'This week the group discussed Friday dinner.',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/recaps',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: [
      {
        id: 'rcp_weekly-001',
        groupId: 'grp_weekend-crew',
        periodStart: '2026-04-05T00:00:00.000Z',
        periodEnd: '2026-04-12T00:00:00.000Z',
        content: 'This week the group discussed Friday dinner.',
        createdAt: '2026-04-12T00:00:00.000Z'
      }
    ]
  });

  await app.close();
});
