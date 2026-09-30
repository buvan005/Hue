import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let app;

before(async () => {
  app = buildApp({ logger: false });
  await app.ready();
});

after(async () => {
  await app.close();
});

test('Security — Liveness and Readiness probes', async () => {
  const healthRes = await app.inject({
    method: 'GET',
    url: '/health'
  });
  assert.equal(healthRes.statusCode, 200);
  const healthData = JSON.parse(healthRes.body);
  assert.equal(healthData.status, 'ok');

  const readyRes = await app.inject({
    method: 'GET',
    url: '/ready'
  });
  assert.equal(readyRes.statusCode, 200);
  const readyData = JSON.parse(readyRes.body);
  assert.equal(readyData.status, 'ready');
  assert.equal(readyData.database, 'connected');
});

test('Security — Username validation and edge cases', async () => {
  // Empty
  const resEmpty = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: '' }
  });
  assert.equal(resEmpty.statusCode, 400);

  // Whitespace only
  const resWhitespace = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: '    ' }
  });
  assert.equal(resWhitespace.statusCode, 400);

  // Too short (< 2 chars)
  const resShort = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: 'a' }
  });
  assert.equal(resShort.statusCode, 400);

  // Too long (> 20 chars)
  const resLong = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: 'a'.repeat(21) }
  });
  assert.equal(resLong.statusCode, 400);

  // Invalid characters
  const resInvalidChar = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: 'user@hack<script>' }
  });
  assert.equal(resInvalidChar.statusCode, 400);

  // Valid username
  const validName = `sec_user_${Date.now().toString().slice(-5)}`;
  const resValid = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { username: validName }
  });
  assert.equal(resValid.statusCode, 200);
  const data = JSON.parse(resValid.body);
  assert.equal(data.username, validName);
  assert(data.id);
});

test('Security — Game creation parameter checks', async () => {
  // Malformed UUID
  const resBadUuid = await app.inject({
    method: 'POST',
    url: '/api/games',
    payload: { userId: 'not-a-uuid', mode: 'standard' }
  });
  assert.equal(resBadUuid.statusCode, 400);

  // Nonexistent user UUID
  const resNonexistentUser = await app.inject({
    method: 'POST',
    url: '/api/games',
    payload: { userId: '00000000-0000-0000-0000-000000000000', mode: 'standard' }
  });
  assert.equal(resNonexistentUser.statusCode, 404);

  // Invalid mode
  const resBadMode = await app.inject({
    method: 'POST',
    url: '/api/games',
    payload: { userId: '00000000-0000-0000-0000-000000000000', mode: 'invalid_mode' }
  });
  assert.equal(resBadMode.statusCode, 400);
});

test('Security — Game round submission and replay protection', async () => {
  // Create test user 1
  const u1Name = `sec_p1_${Date.now().toString().slice(-4)}`;
  const u1Res = await app.inject({ method: 'POST', url: '/api/users', payload: { username: u1Name } });
  const u1 = JSON.parse(u1Res.body);

  // Create test user 2 (attacker)
  const u2Name = `sec_p2_${Date.now().toString().slice(-4)}`;
  const u2Res = await app.inject({ method: 'POST', url: '/api/users', payload: { username: u2Name } });
  const u2 = JSON.parse(u2Res.body);

  // Start game for User 1
  const gameRes = await app.inject({ method: 'POST', url: '/api/games', payload: { userId: u1.id } });
  const game = JSON.parse(gameRes.body);
  const gameId = game.gameId;

  // Invalid Game ID format (params check)
  const resBadGameId = await app.inject({
    method: 'POST',
    url: '/api/games/invalid-uuid/rounds',
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 } }
  });
  assert.equal(resBadGameId.statusCode, 400);

  // Nonexistent game UUID
  const resNonexistentGame = await app.inject({
    method: 'POST',
    url: '/api/games/00000000-0000-0000-0000-000000000000/rounds',
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 } }
  });
  assert.equal(resNonexistentGame.statusCode, 404);

  // Ownership verification: User 2 tries to submit round for User 1's game
  const resUnauthorized = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 }, userId: u2.id }
  });
  assert.equal(resUnauthorized.statusCode, 403, 'Should reject unauthorized submission with 403');

  // Invalid HSB range checks
  const resBadHSB = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 1, guess: { h: 400, s: -5, b: 200 } }
  });
  assert.equal(resBadHSB.statusCode, 400);

  // Attempting round out of sequence (submitting round 2 before round 1)
  const resOutOrder = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 2, guess: { h: 180, s: 50, b: 50 } }
  });
  assert.equal(resOutOrder.statusCode, 400);

  // Valid submission for Round 1
  const resR1 = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 }, userId: u1.id }
  });
  assert.equal(resR1.statusCode, 200);

  // Duplicate submission for Round 1
  const resR1Duplicate = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 }, userId: u1.id }
  });
  assert.equal(resR1Duplicate.statusCode, 400, 'Duplicate round submission must be rejected');

  // Attempting early completion with missing rounds (only 1 round submitted)
  const resEarlyComplete = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/complete`,
    payload: { userId: u1.id }
  });
  assert.equal(resEarlyComplete.statusCode, 400, 'Premature completion with missing rounds must be rejected');

  // Submit remaining rounds 2 through 5
  for (let r = 2; r <= 5; r++) {
    const resR = await app.inject({
      method: 'POST',
      url: `/api/games/${gameId}/rounds`,
      payload: { roundNumber: r, guess: { h: 180, s: 50, b: 50 }, userId: u1.id }
    });
    assert.equal(resR.statusCode, 200);
  }

  // Complete game
  const resComplete = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/complete`,
    payload: { userId: u1.id }
  });
  assert.equal(resComplete.statusCode, 200);
  const endData = JSON.parse(resComplete.body);
  assert.equal(endData.status, 'COMPLETED');

  // Attempting duplicate completion
  const resDupComplete = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/complete`,
    payload: { userId: u1.id }
  });
  assert.equal(resDupComplete.statusCode, 400, 'Duplicate completion must be rejected');

  // Submitting rounds after game is already completed
  const resPostComplete = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/rounds`,
    payload: { roundNumber: 1, guess: { h: 180, s: 50, b: 50 }, userId: u1.id }
  });
  assert.equal(resPostComplete.statusCode, 400, 'Submission after game completion must be rejected');
});

test('Security — Leaderboard parameter validation and query bounds', async () => {
  // Invalid limit (> 100)
  const resOverLimit = await app.inject({
    method: 'GET',
    url: '/api/leaderboard?limit=500'
  });
  assert.equal(resOverLimit.statusCode, 400);

  // Invalid page (< 1)
  const resUnderPage = await app.inject({
    method: 'GET',
    url: '/api/leaderboard?page=0'
  });
  assert.equal(resUnderPage.statusCode, 400);

  // Invalid period string
  const resBadPeriod = await app.inject({
    method: 'GET',
    url: '/api/leaderboard?period=invalid_period'
  });
  assert.equal(resBadPeriod.statusCode, 400);

  // Valid query
  const resValid = await app.inject({
    method: 'GET',
    url: '/api/leaderboard?period=all&limit=10&page=1'
  });
  assert.equal(resValid.statusCode, 200);
});

test('Security — Malformed JSON handling', async () => {
  const resMalformed = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{"username": "broken json without closing quote'
  });
  assert.equal(resMalformed.statusCode, 400);
  const body = JSON.parse(resMalformed.body);
  assert.equal(body.statusCode, 400);
});

test('Security — Rate limiting enforcement', async () => {
  // Rapid fire requests to test rate limiting on a specific endpoint
  const rateLimitApp = buildApp({ logger: false });
  await rateLimitApp.ready();

  const requests = [];
  for (let i = 0; i < 25; i++) {
    requests.push(
      rateLimitApp.inject({
        method: 'POST',
        url: '/api/users',
        payload: { username: `rl_user_${i}_${Date.now()}` }
      })
    );
  }

  const responses = await Promise.all(requests);
  const hasRateLimited = responses.some((r) => r.statusCode === 429);
  assert(hasRateLimited, 'Exceeding endpoint rate limit must return HTTP 429');

  const limitedRes = responses.find((r) => r.statusCode === 429);
  const data = JSON.parse(limitedRes.body);
  assert.equal(data.statusCode, 429);
  assert.equal(data.error, 'Too Many Requests');

  await rateLimitApp.close();
});
