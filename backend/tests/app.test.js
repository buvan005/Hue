import test from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/app.js';

test('Fastify App — Health endpoint GET /health', async () => {
  const app = buildApp({ logger: false });

  const res = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.service, 'hue-api');
  assert.ok(body.timestamp);

  await app.close();
});

test('Fastify App — Reject invalid body on POST /api/users', async () => {
  const app = buildApp({ logger: false });

  const res = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: {
      username: '' // Invalid: empty
    }
  });

  assert.strictEqual(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.strictEqual(body.statusCode, 400);
  assert.ok(body.message.includes('at least 2 characters'));

  await app.close();
});

test('Fastify App — Reject invalid HSB on POST /api/games/:id/rounds', async () => {
  const app = buildApp({ logger: false });

  const res = await app.inject({
    method: 'POST',
    url: '/api/games/123e4567-e89b-12d3-a456-426614174000/rounds',
    payload: {
      roundNumber: 1,
      guess: {
        h: 400, // Invalid: exceeds 360
        s: 50,
        b: 50
      }
    }
  });

  assert.strictEqual(res.statusCode, 400);

  await app.close();
});
