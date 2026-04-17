import test from 'node:test';
import assert from 'node:assert/strict';

import { PlansService } from '../src/modules/plans/plans.service';
import { buildApp } from '../src/app';

const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';

test('PlansService lists plans only for groups the authenticated user is a member of', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const plansService = new PlansService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'pln_friday-dinner',
            group_id: 'grp_weekend-crew',
            title: 'Friday dinner',
            description: 'Try the new sushi place',
            status: 'proposed',
            start_time: '2026-04-18T19:30:00.000Z',
            location: 'Sushi House',
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

  const plans = await plansService.listPlansForUserInGroup({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token'
  });

  assert.match(capturedText, /from plans p/i);
  assert.match(capturedText, /join group_members gm/i);
  assert.match(capturedText, /where p\.group_id = \$1/i);
  assert.match(capturedText, /and gm\.user_id = \$2/i);
  assert.match(capturedText, /order by coalesce\(p\.start_time, p\.created_at\) asc, p\.id asc/i);
  assert.deepEqual(capturedValues, ['grp_weekend-crew', 'usr_dev-token']);
  assert.deepEqual(plans, [
    {
      id: 'pln_friday-dinner',
      groupId: 'grp_weekend-crew',
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      status: 'proposed',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House',
      createdBy: 'usr_dev-token',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  ]);
});

test('PlansService returns null when listing plans for a group the authenticated user cannot access', async () => {
  const plansService = new PlansService({
    async query<T>() {
      return { rows: [] as T[] };
    },
    async connect() {
      throw new Error('not used');
    }
  });

  const plans = await plansService.listPlansForUserInGroup({
    groupId: 'grp_private-group',
    userId: 'usr_non_member'
  });

  assert.equal(plans, null);
});

test('PlansService fetches a single plan only when the authenticated user is a member of the plan group', async () => {
  let capturedText = '';
  let capturedValues: unknown[] = [];

  const plansService = new PlansService({
    async query<T>(text: string, values?: unknown[]) {
      capturedText = text;
      capturedValues = values ?? [];

      return {
        rows: [
          {
            id: 'pln_friday-dinner',
            group_id: 'grp_weekend-crew',
            title: 'Friday dinner',
            description: 'Try the new sushi place',
            status: 'proposed',
            start_time: '2026-04-18T19:30:00.000Z',
            location: 'Sushi House',
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

  const plan = await plansService.getPlanForUser({
    planId: 'pln_friday-dinner',
    userId: 'usr_dev-token'
  });

  assert.match(capturedText, /from plans p/i);
  assert.match(capturedText, /join group_members gm/i);
  assert.match(capturedText, /where p\.id = \$1/i);
  assert.match(capturedText, /and gm\.user_id = \$2/i);
  assert.match(capturedText, /limit 1/i);
  assert.deepEqual(capturedValues, ['pln_friday-dinner', 'usr_dev-token']);
  assert.deepEqual(plan, {
    id: 'pln_friday-dinner',
    groupId: 'grp_weekend-crew',
    title: 'Friday dinner',
    description: 'Try the new sushi place',
    status: 'proposed',
    startTime: '2026-04-18T19:30:00.000Z',
    location: 'Sushi House',
    createdBy: 'usr_dev-token',
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('PlansService returns null when fetching a missing or inaccessible plan', async () => {
  const plansService = new PlansService({
    async query<T>() {
      return { rows: [] as T[] };
    },
    async connect() {
      throw new Error('not used');
    }
  });

  const plan = await plansService.getPlanForUser({
    planId: 'pln_missing',
    userId: 'usr_non_member'
  });

  assert.equal(plan, null);
});

test('PlansService creates a plan only when the authenticated user is a member of the target group', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let released = false;

  const plansService = new PlansService(
    {
      async query<T>() {
        return { rows: [] as T[] };
      },
      async connect() {
        return {
          async query<T>(text: string, values?: readonly unknown[]) {
            queries.push({ text, values });

            if (/insert into plans/i.test(text)) {
              return {
                rows: [
                  {
                    id: 'pln_11111111-1111-4111-8111-111111111111',
                    group_id: 'grp_weekend-crew',
                    title: 'Friday dinner',
                    description: 'Try the new sushi place',
                    status: 'proposed',
                    start_time: '2026-04-18T19:30:00.000Z',
                    location: 'Sushi House',
                    created_by: 'usr_dev-token',
                    created_at: '2026-04-12T00:00:00.000Z'
                  }
                ] as T[]
              };
            }

            if (/from group_members/i.test(text)) {
              return { rows: [{ exists: true }] as T[] };
            }

            return { rows: [] as T[] };
          },
          release() {
            released = true;
          }
        };
      }
    },
    () => '11111111-1111-4111-8111-111111111111'
  );

  const createdPlan = await plansService.createPlan({
    groupId: 'grp_weekend-crew',
    userId: 'usr_dev-token',
    title: 'Friday dinner',
    description: 'Try the new sushi place',
    startTime: '2026-04-18T19:30:00.000Z',
    location: 'Sushi House'
  });

  assert.equal(queries.length, 4);
  assert.match(queries[0].text, /^BEGIN$/i);
  assert.match(queries[1].text, /from group_members/i);
  assert.match(queries[1].text, /where group_id = \$1/i);
  assert.match(queries[1].text, /and user_id = \$2/i);
  assert.deepEqual(queries[1].values, ['grp_weekend-crew', 'usr_dev-token']);
  assert.match(queries[2].text, /insert into plans/i);
  assert.deepEqual(queries[2].values, [
    'pln_11111111-1111-4111-8111-111111111111',
    'grp_weekend-crew',
    'Friday dinner',
    'Try the new sushi place',
    'proposed',
    '2026-04-18T19:30:00.000Z',
    'Sushi House',
    'usr_dev-token'
  ]);
  assert.match(queries[3].text, /^COMMIT$/i);
  assert.equal(released, true);
  assert.deepEqual(createdPlan, {
    id: 'pln_11111111-1111-4111-8111-111111111111',
    groupId: 'grp_weekend-crew',
    title: 'Friday dinner',
    description: 'Try the new sushi place',
    status: 'proposed',
    startTime: '2026-04-18T19:30:00.000Z',
    location: 'Sushi House',
    createdBy: 'usr_dev-token',
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('PlansService returns null when creating a plan for a group the authenticated user cannot access', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let released = false;

  const plansService = new PlansService({
    async query<T>() {
      return { rows: [] as T[] };
    },
    async connect() {
      return {
        async query<T>(text: string, values?: readonly unknown[]) {
          queries.push({ text, values });

          return { rows: [] as T[] };
        },
        release() {
          released = true;
        }
      };
    }
  });

  const createdPlan = await plansService.createPlan({
    groupId: 'grp_private-group',
    userId: 'usr_non_member',
    title: 'Friday dinner',
    description: null,
    startTime: null,
    location: null
  });

  assert.equal(createdPlan, null);
  assert.equal(released, true);
  assert.match(queries[0].text, /^BEGIN$/i);
  assert.match(queries[1].text, /from group_members/i);
  assert.match(queries[2].text, /^ROLLBACK$/i);
});

test('PlansService creates a vote only when the authenticated user can access the target plan through group membership', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let released = false;

  const plansService = new PlansService(
    {
      async query<T>() {
        return { rows: [] as T[] };
      },
      async connect() {
        return {
          async query<T>(text: string, values?: readonly unknown[]) {
            queries.push({ text, values });

            if (/from plans p/i.test(text)) {
              return {
                rows: [
                  {
                    group_id: 'grp_weekend-crew'
                  }
                ] as T[]
              };
            }

            if (/from plan_votes/i.test(text)) {
              return { rows: [] as T[] };
            }

            if (/insert into plan_votes/i.test(text)) {
              return {
                rows: [
                  {
                    id: 'pvt_11111111-1111-4111-8111-111111111111',
                    plan_id: 'pln_friday-dinner',
                    user_id: 'usr_dev-token',
                    vote: 'yes',
                    updated_at: '2026-04-12T00:00:00.000Z'
                  }
                ] as T[]
              };
            }

            return { rows: [] as T[] };
          },
          release() {
            released = true;
          }
        };
      }
    },
    () => '11111111-1111-4111-8111-111111111111'
  );

  const savedVote = await plansService.voteOnPlan({
    planId: 'pln_friday-dinner',
    userId: 'usr_dev-token',
    vote: 'yes'
  });

  assert.equal(queries.length, 5);
  assert.match(queries[0].text, /^BEGIN$/i);
  assert.match(queries[1].text, /from plans p/i);
  assert.match(queries[1].text, /join group_members gm/i);
  assert.match(queries[1].text, /where p\.id = \$1/i);
  assert.match(queries[1].text, /and gm\.user_id = \$2/i);
  assert.deepEqual(queries[1].values, ['pln_friday-dinner', 'usr_dev-token']);
  assert.match(queries[2].text, /from plan_votes/i);
  assert.deepEqual(queries[2].values, ['pln_friday-dinner', 'usr_dev-token']);
  assert.match(queries[3].text, /insert into plan_votes/i);
  assert.deepEqual(queries[3].values, [
    'pvt_11111111-1111-4111-8111-111111111111',
    'pln_friday-dinner',
    'usr_dev-token',
    'yes'
  ]);
  assert.match(queries[4].text, /^COMMIT$/i);
  assert.equal(released, true);
  assert.deepEqual(savedVote, {
    id: 'pvt_11111111-1111-4111-8111-111111111111',
    planId: 'pln_friday-dinner',
    userId: 'usr_dev-token',
    vote: 'yes',
    updatedAt: '2026-04-12T00:00:00.000Z'
  });
});

test('PlansService returns null when voting on a missing or inaccessible plan', async () => {
  const queries: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let released = false;

  const plansService = new PlansService({
    async query<T>() {
      return { rows: [] as T[] };
    },
    async connect() {
      return {
        async query<T>(text: string, values?: readonly unknown[]) {
          queries.push({ text, values });

          return { rows: [] as T[] };
        },
        release() {
          released = true;
        }
      };
    }
  });

  const savedVote = await plansService.voteOnPlan({
    planId: 'pln_missing',
    userId: 'usr_non_member',
    vote: 'no'
  });

  assert.equal(savedVote, null);
  assert.equal(released, true);
  assert.match(queries[0].text, /^BEGIN$/i);
  assert.match(queries[1].text, /from plans p/i);
  assert.match(queries[2].text, /^ROLLBACK$/i);
});

test('GET /v1/groups/:groupId/plans rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/plans'
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

test('GET /v1/groups/:groupId/plans returns 404 for inaccessible target groups', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_private-group/plans',
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

test('GET /v1/groups/:groupId/plans succeeds for authenticated group members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (text: string) => {
    if (/from plans p/i.test(text)) {
      return {
        rows: [
          {
            id: 'pln_friday-dinner',
            group_id: 'grp_weekend-crew',
            title: 'Friday dinner',
            description: 'Try the new sushi place',
            status: 'proposed',
            start_time: '2026-04-18T19:30:00.000Z',
            location: 'Sushi House',
            created_by: 'usr_dev-token',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/groups/grp_weekend-crew/plans',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: [
      {
        id: 'pln_friday-dinner',
        groupId: 'grp_weekend-crew',
        title: 'Friday dinner',
        description: 'Try the new sushi place',
        status: 'proposed',
        startTime: '2026-04-18T19:30:00.000Z',
        location: 'Sushi House',
        createdBy: 'usr_dev-token',
        createdAt: '2026-04-12T00:00:00.000Z'
      }
    ]
  });

  await app.close();
});

test('GET /v1/plans/:planId rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/plans/pln_friday-dinner'
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

test('GET /v1/plans/:planId returns 404 for missing or inaccessible plans', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async () => ({ rows: [] });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/plans/pln_missing',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'PLAN_NOT_FOUND',
      message: 'Plan not found'
    }
  });

  await app.close();
});

test('GET /v1/plans/:planId succeeds for authenticated members with access to the plan group', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.query = async (text: string, values?: readonly unknown[]) => {
    if (/where p\.id = \$1/i.test(text) && values?.[0] === 'pln_friday-dinner') {
      return {
        rows: [
          {
            id: 'pln_friday-dinner',
            group_id: 'grp_weekend-crew',
            title: 'Friday dinner',
            description: 'Try the new sushi place',
            status: 'proposed',
            start_time: '2026-04-18T19:30:00.000Z',
            location: 'Sushi House',
            created_by: 'usr_dev-token',
            created_at: '2026-04-12T00:00:00.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  };

  const response = await app.inject({
    method: 'GET',
    url: '/v1/plans/pln_friday-dinner',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'pln_friday-dinner',
      groupId: 'grp_weekend-crew',
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      status: 'proposed',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House',
      createdBy: 'usr_dev-token',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/plans rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/plans',
    payload: {
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House'
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

test('POST /v1/groups/:groupId/plans rejects invalid payloads with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  const missingTitleResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/plans',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      description: 'Try the new sushi place'
    }
  });

  assert.equal(missingTitleResponse.statusCode, 400);
  assert.deepEqual(missingTitleResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid plan payload'
    }
  });

  const blankTitleResponse = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/plans',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      title: '   '
    }
  });

  assert.equal(blankTitleResponse.statusCode, 400);
  assert.deepEqual(blankTitleResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid plan payload'
    }
  });

  await app.close();
});

test('POST /v1/groups/:groupId/plans returns 404 for inaccessible target groups', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.connect = async () => ({
    async query<T>() {
      return { rows: [] as T[] };
    },
    release() {}
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_private-group/plans',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House'
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

test('POST /v1/groups/:groupId/plans succeeds for authenticated group members', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.connect = async () => ({
    async query<T>(text: string) {
      if (/from group_members/i.test(text)) {
        return { rows: [{ exists: true }] as T[] };
      }

      if (/insert into plans/i.test(text)) {
        return {
          rows: [
            {
              id: 'pln_11111111-1111-4111-8111-111111111111',
              group_id: 'grp_weekend-crew',
              title: 'Friday dinner',
              description: 'Try the new sushi place',
              status: 'proposed',
              start_time: '2026-04-18T19:30:00.000Z',
              location: 'Sushi House',
              created_by: 'usr_dev-token',
              created_at: '2026-04-12T00:00:00.000Z'
            }
          ] as T[]
        };
      }

      return { rows: [] as T[] };
    },
    release() {}
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/groups/grp_weekend-crew/plans',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House'
    }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'pln_11111111-1111-4111-8111-111111111111',
      groupId: 'grp_weekend-crew',
      title: 'Friday dinner',
      description: 'Try the new sushi place',
      status: 'proposed',
      startTime: '2026-04-18T19:30:00.000Z',
      location: 'Sushi House',
      createdBy: 'usr_dev-token',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('POST /v1/plans/:planId/votes rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/plans/pln_friday-dinner/votes',
    payload: {
      vote: 'yes'
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

test('POST /v1/plans/:planId/votes rejects invalid payloads with a structured error', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  const missingVoteResponse = await app.inject({
    method: 'POST',
    url: '/v1/plans/pln_friday-dinner/votes',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {}
  });

  assert.equal(missingVoteResponse.statusCode, 400);
  assert.deepEqual(missingVoteResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid plan vote payload'
    }
  });

  const invalidVoteResponse = await app.inject({
    method: 'POST',
    url: '/v1/plans/pln_friday-dinner/votes',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      vote: 'later'
    }
  });

  assert.equal(invalidVoteResponse.statusCode, 400);
  assert.deepEqual(invalidVoteResponse.json(), {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid plan vote payload'
    }
  });

  await app.close();
});

test('POST /v1/plans/:planId/votes returns 404 for missing or inaccessible plans', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.connect = async () => ({
    async query<T>() {
      return { rows: [] as T[] };
    },
    release() {}
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/plans/pln_missing/votes',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      vote: 'no'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    ok: false,
    error: {
      code: 'PLAN_NOT_FOUND',
      message: 'Plan not found'
    }
  });

  await app.close();
});

test('POST /v1/plans/:planId/votes succeeds for authenticated members with access to the plan group', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  app.db.connect = async () => ({
    async query<T>(text: string) {
      if (/from plans p/i.test(text)) {
        return {
          rows: [
            {
              group_id: 'grp_weekend-crew'
            }
          ] as T[]
        };
      }

      if (/from plan_votes/i.test(text)) {
        return { rows: [] as T[] };
      }

      if (/insert into plan_votes/i.test(text)) {
        return {
          rows: [
            {
              id: 'pvt_11111111-1111-4111-8111-111111111111',
              plan_id: 'pln_friday-dinner',
              user_id: 'usr_dev-token',
              vote: 'yes',
              updated_at: '2026-04-12T00:00:00.000Z'
            }
          ] as T[]
        };
      }

      return { rows: [] as T[] };
    },
    release() {}
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/plans/pln_friday-dinner/votes',
    headers: {
      authorization: 'Bearer dev-token'
    },
    payload: {
      vote: 'yes'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'pvt_11111111-1111-4111-8111-111111111111',
      planId: 'pln_friday-dinner',
      userId: 'usr_dev-token',
      vote: 'yes',
      updatedAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});
