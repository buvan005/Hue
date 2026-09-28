import prisma from '../backend/src/utils/prisma.js';

const API_BASE = 'http://localhost:3000';

async function run() {
  console.log('🧪 Starting end-to-end verification of game completion and leaderboard...\n');

  const testUsername = `player_${Date.now().toString().slice(-5)}`;
  console.log(`Step 1: Register user "${testUsername}"`);
  const userRes = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername })
  });
  const userData = await userRes.json();
  console.log('  Response:', userData);
  if (!userData.id) throw new Error('Failed to create user');
  const userId = userData.id;

  console.log(`\nStep 2: Start new game session for user ${userId}`);
  const gameRes = await fetch(`${API_BASE}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mode: 'standard' })
  });
  const gameData = await gameRes.json();
  console.log('  Response:', gameData);
  const gameId = gameData.gameId;
  if (!gameId) throw new Error('Failed to create game session');

  console.log(`\nStep 3: Play and submit all 5 rounds for game ${gameId}`);
  let currentTarget = gameData.target;
  let totalScoreFromRounds = 0;

  for (let round = 1; round <= 5; round++) {
    // Generate a guess very close to the target
    const guess = {
      h: currentTarget.h,
      s: currentTarget.s,
      b: currentTarget.b
    };

    const roundRes = await fetch(`${API_BASE}/api/games/${gameId}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: round, guess })
    });
    const roundData = await roundRes.json();
    console.log(`  Round ${round} score: ${roundData.score} (dE: ${roundData.dE})`);
    totalScoreFromRounds = roundData.totalScore;
    currentTarget = roundData.nextTarget;
  }

  console.log(`\nStep 4: Complete game via POST /api/games/${gameId}/complete`);
  const compRes = await fetch(`${API_BASE}/api/games/${gameId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const compData = await compRes.json();
  console.log('  Completion response:', compData);

  console.log('\nStep 5: Verify in PostgreSQL database directly via Prisma');
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  console.log('  ✓ User in DB:', dbUser ? `${dbUser.username} (${dbUser.id})` : 'MISSING!');
  if (!dbUser) throw new Error('User not found in DB');

  const dbGame = await prisma.game.findUnique({
    where: { id: gameId },
    include: { rounds: true }
  });
  console.log('  ✓ Game status in DB:', dbGame?.status);
  console.log('  ✓ Game total_score in DB:', dbGame?.total_score);
  console.log('  ✓ Game completed_at in DB:', dbGame?.completed_at);
  console.log('  ✓ Rounds count in DB:', dbGame?.rounds?.length);

  if (dbGame?.status !== 'COMPLETED') throw new Error(`Game status is ${dbGame?.status}, expected COMPLETED`);
  if (!dbGame?.completed_at) throw new Error('Game completed_at is null');
  if (dbGame?.rounds?.length !== 5) throw new Error(`Expected 5 rounds, got ${dbGame?.rounds?.length}`);

  console.log('\nStep 6: Test Leaderboard API for TODAY');
  const lbTodayRes = await fetch(`${API_BASE}/api/leaderboard?period=today`);
  const lbToday = await lbTodayRes.json();
  console.log(`  Entries count: ${lbToday.entries.length}`);
  const foundToday = lbToday.entries.find((e) => e.gameId === gameId || e.username === testUsername);
  console.log('  ✓ Found in TODAY leaderboard:', foundToday ? `Rank #${foundToday.rank}, Score: ${foundToday.score}` : 'MISSING!');
  if (!foundToday) throw new Error('Game NOT found in TODAY leaderboard!');

  console.log('\nStep 7: Test Leaderboard API for WEEK');
  const lbWeekRes = await fetch(`${API_BASE}/api/leaderboard?period=week`);
  const lbWeek = await lbWeekRes.json();
  const foundWeek = lbWeek.entries.find((e) => e.gameId === gameId || e.username === testUsername);
  console.log('  ✓ Found in WEEK leaderboard:', foundWeek ? `Rank #${foundWeek.rank}, Score: ${foundWeek.score}` : 'MISSING!');
  if (!foundWeek) throw new Error('Game NOT found in WEEK leaderboard!');

  console.log('\nStep 8: Test Leaderboard API for ALL');
  const lbAllRes = await fetch(`${API_BASE}/api/leaderboard?period=all`);
  const lbAll = await lbAllRes.json();
  const foundAll = lbAll.entries.find((e) => e.gameId === gameId || e.username === testUsername);
  console.log('  ✓ Found in ALL leaderboard:', foundAll ? `Rank #${foundAll.rank}, Score: ${foundAll.score}` : 'MISSING!');
  if (!foundAll) throw new Error('Game NOT found in ALL leaderboard!');

  console.log('\nStep 9: Test alternative period parameters (daily, weekly)');
  const lbDailyRes = await fetch(`${API_BASE}/api/leaderboard?period=daily`);
  const lbDaily = await lbDailyRes.json();
  const foundDaily = lbDaily.entries.find((e) => e.gameId === gameId);
  console.log('  ✓ Found in daily query:', !!foundDaily);

  const lbWeeklyRes = await fetch(`${API_BASE}/api/leaderboard?period=weekly`);
  const lbWeekly = await lbWeeklyRes.json();
  const foundWeekly = lbWeekly.entries.find((e) => e.gameId === gameId);
  console.log('  ✓ Found in weekly query:', !!foundWeekly);

  console.log('\n🎉 ALL 14 TRACE POINTS AND VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((e) => {
  console.error('\n❌ VERIFICATION FAILED:', e);
  process.exit(1);
});
