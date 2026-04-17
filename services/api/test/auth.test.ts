import test from 'node:test';
import assert from 'node:assert/strict';

import { AuthService } from '../src/modules/auth/auth.service';
import { buildApp } from '../src/app';

const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';

test('AuthService builds the authenticated identity payload for /v1/auth/me', async () => {
  const authService = new AuthService();
  const identity = authService.buildAuthenticatedIdentity({
    userId: 'usr_dev-token',
    sessionToken: 'dev-token'
  });

  assert.deepEqual(identity, {
    id: 'usr_dev-token',
    displayName: 'Dev User',
    email: null,
    avatarUrl: null,
    createdAt: '2026-04-12T00:00:00.000Z'
  });
});

test('auth module decorates Fastify with a reusable requireSession preHandler', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();

  assert.equal(typeof app.requireSession, 'function');

  await app.close();
});

test('GET /v1/auth/me rejects unauthenticated requests', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/auth/me'
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

test('GET /v1/auth/me returns authenticated identity without exposing session token', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1/auth/me',
    headers: {
      authorization: 'Bearer dev-token'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    data: {
      id: 'usr_dev-token',
      displayName: 'Dev User',
      email: null,
      avatarUrl: null,
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  await app.close();
});

test('GET /health remains public and proves auth wiring is route-level', async () => {
  process.env.DATABASE_URL = DATABASE_URL;

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'ok'
  });

  await app.close();
});
