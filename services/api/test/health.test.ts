import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApp } from '../src/app';

test('GET /health returns ok status', async () => {
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dolcove';

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });

  await app.close();
});

test('buildApp requires DATABASE_URL', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  await assert.rejects(async () => {
    await buildApp();
  }, /DATABASE_URL is required/);

  if (previous) {
    process.env.DATABASE_URL = previous;
  }
});
