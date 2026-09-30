import test from 'node:test';
import assert from 'node:assert';
import prisma from '../src/utils/prisma.js';
import {
  buildPlayerLeaderboard,
  getPlayerRankAndPercentile,
  getLeaderboard
} from '../src/services/leaderboardService.js';
import { getPlayerStats } from '../src/services/statsService.js';

test('Leaderboard & Ranking — Unique Players & Personal Best', async () => {
  // Setup test users with unique normalized usernames
  const timestamp = Date.now();
  const userA = await prisma.user.create({
    data: { username: `test_a_${timestamp}`, username_normalized: `test_a_${timestamp}` }
  });
  const userB = await prisma.user.create({
    data: { username: `test_b_${timestamp}`, username_normalized: `test_b_${timestamp}` }
  });
  const userC = await prisma.user.create({
    data: { username: `test_c_${timestamp}`, username_normalized: `test_c_${timestamp}` }
  });

  const now = new Date();

  // User A plays 3 games: 40, 45, 42
  await prisma.game.createMany({
    data: [
      { user_id: userA.id, status: 'COMPLETED', total_score: 40, completed_at: new Date(now.getTime() - 3000) },
      { user_id: userA.id, status: 'COMPLETED', total_score: 45, completed_at: new Date(now.getTime() - 2000) },
      { user_id: userA.id, status: 'COMPLETED', total_score: 42, completed_at: new Date(now.getTime() - 1000) }
    ]
  });

  // User B plays 1 game: 43
  await prisma.game.create({
    data: { user_id: userB.id, status: 'COMPLETED', total_score: 43, completed_at: new Date(now.getTime() - 1500) }
  });

  // User C plays 1 game: 30
  await prisma.game.create({
    data: { user_id: userC.id, status: 'COMPLETED', total_score: 30, completed_at: new Date(now.getTime() - 1000) }
  });

  // Also an in-progress game for User C that should NOT be counted
  await prisma.game.create({
    data: { user_id: userC.id, status: 'IN_PROGRESS', total_score: 50 }
  });

  // Query leaderboard
  const lb = await buildPlayerLeaderboard('all');
  const userARows = lb.filter((p) => p.userId === userA.id);
  const userBRows = lb.filter((p) => p.userId === userB.id);
  const userCRows = lb.filter((p) => p.userId === userC.id);

  // Exactly one row per user
  assert.strictEqual(userARows.length, 1, 'User A must appear exactly once on leaderboard');
  assert.strictEqual(userBRows.length, 1, 'User B must appear exactly once on leaderboard');
  assert.strictEqual(userCRows.length, 1, 'User C must appear exactly once on leaderboard');

  // Authoritative best score
  assert.strictEqual(userARows[0].bestScore, 45, 'User A best score must be 45');
  assert.strictEqual(userBRows[0].bestScore, 43, 'User B best score must be 43');
  assert.strictEqual(userCRows[0].bestScore, 30, 'User C best score must be 30 (ignoring IN_PROGRESS 50)');

  // Relative ranking: User A (45) > User B (43) > User C (30)
  assert.ok(userARows[0].rank < userBRows[0].rank, 'User A must rank higher than User B');
  assert.ok(userBRows[0].rank < userCRows[0].rank, 'User B must rank higher than User C');

  // getPlayerRankAndPercentile must match leaderboard rank exactly
  const rankA = await getPlayerRankAndPercentile(userA.id, 'all');
  assert.strictEqual(rankA.rank, userARows[0].rank, 'getPlayerRankAndPercentile rank must match leaderboard rank');
  assert.strictEqual(rankA.bestScore, 45);

  const statsA = await getPlayerStats(userA.id);
  assert.strictEqual(statsA.rank, userARows[0].rank, 'Player stats rank must match leaderboard rank');
  assert.strictEqual(statsA.gamesPlayed, 3, 'Games played must reflect all completed games');
  assert.strictEqual(statsA.bestScore, 45);
});

test('Leaderboard & Ranking — Tie-breaking uses timestamp of personal-best game', async () => {
  const timestamp = Date.now();
  const userT1 = await prisma.user.create({
    data: { username: `test_t1_${timestamp}`, username_normalized: `test_t1_${timestamp}` }
  });
  const userT2 = await prisma.user.create({
    data: { username: `test_t2_${timestamp}`, username_normalized: `test_t2_${timestamp}` }
  });

  const timeEarly = new Date(Date.now() - 50000);
  const timeLate = new Date(Date.now() - 10000);

  const uniqueTieScore = 47.791;

  // userT1 achieves score earlier
  await prisma.game.create({
    data: { user_id: userT1.id, status: 'COMPLETED', total_score: uniqueTieScore, completed_at: timeEarly }
  });

  // userT2 achieves score later
  await prisma.game.create({
    data: { user_id: userT2.id, status: 'COMPLETED', total_score: uniqueTieScore, completed_at: timeLate }
  });

  const lb = await buildPlayerLeaderboard('all');
  const t1 = lb.find((p) => p.userId === userT1.id);
  const t2 = lb.find((p) => p.userId === userT2.id);

  assert.ok(t1, 'User T1 must be present');
  assert.ok(t2, 'User T2 must be present');
  assert.strictEqual(t1.bestScore, uniqueTieScore);
  assert.strictEqual(t2.bestScore, uniqueTieScore);

  // Earlier completion ranks first
  assert.strictEqual(t1.rank + 1, t2.rank, 'Earlier personal best must rank higher in tie-break');

  // Both should have the same percentile because they share the same bestScore
  assert.strictEqual(t1.percentile, t2.percentile, 'Tied scores must share the same percentile');
});

test('Leaderboard API — Paged response contract', async () => {
  const result = await getLeaderboard({ page: 1, limit: 10, period: 'all' });
  assert.ok(result.entries, 'Response must have entries');
  assert.strictEqual(result.period, 'all');
  assert.ok(result.totalPlayers >= 0);

  // Check no duplicates in entries
  const seenUserIds = new Set();
  for (const entry of result.entries) {
    assert.ok(!seenUserIds.has(entry.userId), `Duplicate player found in leaderboard: ${entry.username}`);
    seenUserIds.add(entry.userId);
    assert.ok(entry.rank > 0);
    assert.strictEqual(typeof entry.score, 'number');
  }
});
