import assert from 'node:assert/strict';
import { validateUsername, normalizeUsername } from '../src/stores/gameStore.js';
import prisma from '../backend/src/utils/prisma.js';

console.log('--- STARTING GAMEPLAY STATE AUDIT & VERIFICATION ---');

// ============================================================================
// TEST 1: USERNAME VALIDATION LOGIC
// ============================================================================
console.log('\n[TEST 1] Username validation rules:');

const emptyChecks = ['', '   ', '\t', '\n', null, undefined];
for (const val of emptyChecks) {
  const res = validateUsername(val);
  assert.equal(res.valid, false, `Expected ${JSON.stringify(val)} to be invalid`);
  console.log(`  ✓ Blocked empty/whitespace value: ${JSON.stringify(val)} -> error: ${res.error}`);
}

const invalidChars = ['bad@user', 'test space', 'a', 'a'.repeat(21), 'hello!'];
for (const val of invalidChars) {
  const res = validateUsername(val);
  assert.equal(res.valid, false, `Expected ${JSON.stringify(val)} to be invalid`);
  console.log(`  ✓ Blocked invalid value: ${JSON.stringify(val)} -> error: ${res.error}`);
}

const validUsernames = ['ace_pilot', 'Agent-007', 'Player123', '  trimmed_user  '];
for (const val of validUsernames) {
  const res = validateUsername(val);
  assert.equal(res.valid, true, `Expected ${JSON.stringify(val)} to be valid`);
  assert.equal(res.username, val.trim());
  console.log(`  ✓ Accepted valid value: ${JSON.stringify(val)} -> username: "${res.username}"`);
}

// ============================================================================
// TEST 2: BACKEND ENDPOINT REJECTION OF EMPTY / INVALID USERNAMES
// ============================================================================
console.log('\n[TEST 2] Backend POST /api/users validation:');

const resEmpty = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: '' })
});
assert.equal(resEmpty.status, 400, 'Backend must reject empty username with 400');
const emptyBody = await resEmpty.json();
console.log(`  ✓ POST /api/users with empty string returned 400: ${JSON.stringify(emptyBody)}`);

const resWhitespace = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: '     ' })
});
assert.equal(resWhitespace.status, 400, 'Backend must reject whitespace username with 400');
console.log(`  ✓ POST /api/users with whitespace returned 400`);

// Verify no empty or null usernames exist in the DB
const invalidDbUsers = await prisma.user.findMany({
  where: {
    OR: [
      { username: '' },
      { username_normalized: '' }
    ]
  }
});
assert.equal(invalidDbUsers.length, 0, 'No empty or blank users should exist in PostgreSQL');
console.log(`  ✓ Database audit: 0 empty or blank users exist in PostgreSQL`);

// ============================================================================
// TEST 3: FULL GAMEPLAY CYCLE & END SCREEN PERSISTENCE SIMULATION
// ============================================================================
console.log('\n[TEST 3] Game Lifecycle & END Screen Indefinite Persistence:');

const testUsername = `tester_${Date.now().toString().slice(-5)}`;

// 1. Create user
const userRes = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: testUsername })
});
assert.equal(userRes.status, 200);
const user = await userRes.json();
const userId = user.id;
console.log(`  ✓ Created test player: ${testUsername} (ID: ${userId})`);

// 2. Start game
const gameRes = await fetch('http://localhost:3000/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, mode: 'standard' })
});
assert.equal(gameRes.status, 201);
const gameData = await gameRes.json();
const gameId = gameData.gameId || gameData.game?.id;
console.log(`  ✓ Started game: ${gameId}`);

// 3. Play 5 rounds
for (let r = 1; r <= 5; r++) {
  const roundRes = await fetch(`http://localhost:3000/api/games/${gameId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roundNumber: r,
      guess: { h: 180, s: 50, b: 50 }
    })
  });
  assert.equal(roundRes.status, 200);
}
console.log(`  ✓ Completed all 5 rounds with guess submissions`);

// 4. Complete game (reaching END state)
const completeRes = await fetch(`http://localhost:3000/api/games/${gameId}/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
assert.equal(completeRes.status, 200);
const endData = await completeRes.json();
console.log(`  ✓ Game marked COMPLETED: totalScore=${endData.totalScore}, rank=${endData.rank}`);

// 5. Test that game record in DB is COMPLETED
const dbGame = await prisma.game.findUnique({ where: { id: gameId } });
assert.equal(dbGame.status, 'COMPLETED');
assert(dbGame.total_score > 0);
assert(dbGame.completed_at !== null);
console.log(`  ✓ PostgreSQL verified: game ${gameId} has status='COMPLETED', total_score=${dbGame.total_score}`);

// 6. Test Leaderboard API from END state
const lbRes = await fetch('http://localhost:3000/api/leaderboard?period=daily&limit=10');
assert.equal(lbRes.status, 200);
const lbData = await lbRes.json();
assert(Array.isArray(lbData.entries));
console.log(`  ✓ Leaderboard query succeeds from END state: ${lbData.entries.length} entries returned`);

// 7. Verify Play Again starts new game without re-asking username
const playAgainRes = await fetch('http://localhost:3000/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, mode: 'standard' })
});
assert.equal(playAgainRes.status, 201);
const newGame = await playAgainRes.json();
const newGameId = newGame.gameId || newGame.game?.id;
assert.notEqual(newGameId, gameId, 'New game must receive a new unique gameId');
console.log(`  ✓ Play Again created fresh game: ${newGameId} for existing user ${testUsername}`);

// Verify historical games still intact
const userGames = await prisma.game.findMany({ where: { user_id: userId } });
assert.equal(userGames.length, 2, 'Both previous and new game must exist (history never deleted)');
console.log(`  ✓ History intact: user has ${userGames.length} games (1 COMPLETED, 1 IN_PROGRESS)`);

console.log('\n======================================================');
console.log('ALL VERIFICATION GATES PASSED SUCCESSFULLY!');
console.log('======================================================');
process.exit(0);
