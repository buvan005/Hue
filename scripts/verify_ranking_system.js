
const API_BASE = 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runRankingSystemAudit() {
  console.log('================================================================');
  console.log('       HUE RANKING & LEADERBOARD SYSTEM COMPREHENSIVE AUDIT     ');
  console.log('================================================================\n');

  const shortTs = Date.now().toString().slice(-6);
  const names = [`ali_${shortTs}`, `bob_${shortTs}`, `cha_${shortTs}`, `dav_${shortTs}`, `eve_${shortTs}`];
  const users = {};

  // 1. Create several users via API
  console.log('--- 1. Creating Users via API ---');
  for (const name of names) {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name })
    });
    const data = await res.json();
    assert(res.ok, `Failed to create user ${name}: ${JSON.stringify(data)}`);
    const id = data?.user?.id ?? data?.id;
    users[name] = id;
    console.log(`Created: ${name} -> ${id}`);
  }

  // 2. Play and complete multiple games with controlled scores
  console.log('\n--- 2. Setting Up Controlled Games & Scores ---');

  // Helper to simulate completing a game with custom total score
  async function completeCustomGame(userId, score, completedAtDate = new Date()) {
    const gRes = await fetch(`${API_BASE}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mode: 'standard' })
    });
    const gData = await gRes.json();
    const gameId = gData?.game?.id ?? gData?.gameId;

    // Direct DB update for test isolation: complete with specific score and date
    const { default: prisma } = await import('../backend/src/utils/prisma.js');
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        total_score: score,
        rounds_completed: 5,
        completed_at: completedAtDate
      }
    });
    return gameId;
  }

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // User Alice: multiple games (Game 1 = 35 [10d ago], Game 2 = 46.5 [today], Game 3 = 41.0 [today])
  // -> Alice ALL best: 46.5, TODAY best: 46.5
  console.log(`Setting up Alice with 3 games: 35.0 (10d ago), 46.5 (today), 41.0 (today)`);
  await completeCustomGame(users[names[0]], 35.0, tenDaysAgo);
  await completeCustomGame(users[names[0]], 46.5, new Date(now.getTime() - 5000));
  await completeCustomGame(users[names[0]], 41.0, new Date(now.getTime() - 1000));

  // User Bob: 1 game today = 48.0 (achieved 4000ms ago)
  console.log(`Setting up Bob with 1 game: 48.0 (today, earlier tie)`);
  await completeCustomGame(users[names[1]], 48.0, new Date(now.getTime() - 4000));

  // User Charlie: 1 game today = 48.0 (achieved 2000ms ago - TIED with Bob, but later)
  console.log(`Setting up Charlie with 1 game: 48.0 (today, later tie)`);
  await completeCustomGame(users[names[2]], 48.0, new Date(now.getTime() - 2000));

  // User David: 1 game = 42.0 (2 days ago, within WEEK, not in TODAY)
  console.log(`Setting up David with 1 game: 42.0 (2 days ago, within WEEK)`);
  await completeCustomGame(users[names[3]], 42.0, twoDaysAgo);

  // User Eve: 1 game = 30.0 (10 days ago, in ALL, not in WEEK or TODAY)
  console.log(`Setting up Eve with 1 game: 30.0 (10 days ago, in ALL)`);
  await completeCustomGame(users[names[4]], 30.0, tenDaysAgo);

  // 3. Test ALL Leaderboard
  console.log('\n--- 3. Testing ALL Leaderboard ---');
  const allRes = await fetch(`${API_BASE}/api/leaderboard?period=all&limit=50`);
  const allData = await allRes.json();
  const allEntries = allData.entries;

  console.log(`ALL Leaderboard total players returned: ${allEntries.length}`);
  for (const e of allEntries.filter(e => names.includes(e.username))) {
    console.log(`  Rank #${e.rank}: ${e.username} - Score: ${e.score} (Achieved: ${e.achievedAt})`);
  }

  // Check: No duplicate players
  const allSeen = new Set();
  for (const e of allEntries) {
    assert(!allSeen.has(e.username), `Duplicate username in ALL leaderboard: ${e.username}`);
    allSeen.add(e.username);
  }
  console.log('✅ Check passed: Exactly ONE row per unique player in ALL leaderboard.');

  // Check Alice appears only once with 46.5
  const aliceAll = allEntries.find(e => e.username === names[0]);
  assert(aliceAll, 'Alice must be in ALL leaderboard');
  assert(aliceAll.score === 46.5, `Alice best score in ALL must be 46.5, got ${aliceAll.score}`);
  console.log(`✅ Check passed: Alice appears once with personal best 46.5 (out of 3 games).`);

  // Check Tie-breaker between Bob (48.0 earlier) and Charlie (48.0 later)
  const bobAll = allEntries.find(e => e.username === names[1]);
  const charlieAll = allEntries.find(e => e.username === names[2]);
  assert(bobAll && charlieAll, 'Both Bob and Charlie must be in ALL leaderboard');
  assert(bobAll.score === 48.0 && charlieAll.score === 48.0, 'Bob and Charlie score must be 48.0');
  assert(bobAll.rank < charlieAll.rank, `Bob (earlier 48.0) must rank ahead of Charlie (later 48.0). Bob: #${bobAll.rank}, Charlie: #${charlieAll.rank}`);
  console.log(`✅ Check passed: Bob (achieved earlier) ranks #${bobAll.rank} ahead of Charlie #${charlieAll.rank}.`);

  // 4. Test TODAY Leaderboard
  console.log('\n--- 4. Testing TODAY Leaderboard ---');
  const todayRes = await fetch(`${API_BASE}/api/leaderboard?period=today&limit=100`);
  const todayData = await todayRes.json();
  const todayEntries = todayData.entries;

  const todayNames = todayEntries.map(e => e.username);
  console.log(`TODAY Leaderboard players: ${todayNames.join(', ')}`);

  // David (2d ago) and Eve (10d ago) must NOT be in TODAY
  assert(!todayNames.includes(names[3]), 'David (2 days ago) must NOT appear in TODAY leaderboard');
  assert(!todayNames.includes(names[4]), 'Eve (10 days ago) must NOT appear in TODAY leaderboard');
  assert(todayNames.includes(names[0]), 'Alice (today) must appear in TODAY leaderboard');
  assert(todayNames.includes(names[1]), 'Bob (today) must appear in TODAY leaderboard');
  assert(todayNames.includes(names[2]), 'Charlie (today) must appear in TODAY leaderboard');
  console.log('✅ Check passed: TODAY leaderboard contains only games completed today.');

  // 5. Test WEEK Leaderboard
  console.log('\n--- 5. Testing WEEK Leaderboard ---');
  const weekRes = await fetch(`${API_BASE}/api/leaderboard?period=week&limit=100`);
  const weekData = await weekRes.json();
  const weekNames = weekData.entries.map(e => e.username);
  console.log(`WEEK Leaderboard players: ${weekNames.join(', ')}`);

  assert(weekNames.includes(names[3]), 'David (2 days ago) must appear in WEEK leaderboard');
  assert(!weekNames.includes(names[4]), 'Eve (10 days ago) must NOT appear in WEEK leaderboard');
  console.log('✅ Check passed: WEEK leaderboard includes 2-day-old game, excludes 10-day-old game.');

  // 6. Test Player Stats API for Alice
  console.log('\n--- 6. Testing GET /api/users/:userId/stats ---');
  const statsRes = await fetch(`${API_BASE}/api/users/${users[names[0]]}/stats`);
  const statsData = await statsRes.json();

  console.log('Alice Stats:');
  console.log(`  Games Played: ${statsData.gamesPlayed}`);
  console.log(`  Best Score: ${statsData.bestScore}`);
  console.log(`  Global Rank: #${statsData.globalRank}`);
  console.log(`  Percentile: ${statsData.percentile}% (strictly lower unique players)`);

  assert(statsData.gamesPlayed === 3, `Alice games played must be 3, got ${statsData.gamesPlayed}`);
  assert(statsData.bestScore === 46.5, `Alice best score must be 46.5, got ${statsData.bestScore}`);
  assert(statsData.globalRank === aliceAll.rank, `Alice stats rank (#${statsData.globalRank}) must match ALL leaderboard rank (#${aliceAll.rank})`);
  console.log('✅ Check passed: Alice stats rank matches ALL leaderboard rank exactly.');

  // 7. Test Playing a New Game and Verifying Complete Game API Output
  console.log('\n--- 7. Completing a New Game for Alice and Verifying Ranks Match ---');
  // Alice plays a 4th game with 49.5 (which becomes her NEW personal best!)
  const newGameRes = await fetch(`${API_BASE}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: users[names[0]], mode: 'standard' })
  });
  const newGameData = await newGameRes.json();
  const newGameId = newGameData?.game?.id ?? newGameData?.gameId;

  // Submit 5 rounds to complete properly
  for (let r = 1; r <= 5; r++) {
    await fetch(`${API_BASE}/api/games/${newGameId}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: r, guess: { h: 180, s: 50, b: 50 } })
    });
  }

  // Set rounds to 9.9 each so completeGame tallies 49.5
  const { default: prisma } = await import('../backend/src/utils/prisma.js');
  await prisma.round.updateMany({
    where: { game_id: newGameId },
    data: { score: 9.9 }
  });

  const completeRes = await fetch(`${API_BASE}/api/games/${newGameId}/complete`, { method: 'POST' });
  const completeData = await completeRes.json();

  console.log('Complete Game Response for Alice:');
  console.log(`  Final Score: ${completeData.totalScore}`);
  console.log(`  Personal Best: ${completeData.personalBest}`);
  console.log(`  Is New Best: ${completeData.isNewBest}`);
  console.log(`  Global Rank: #${completeData.globalRank}`);
  console.log(`  Percentile: ${completeData.percentile}%`);

  assert(completeData.isNewBest === true, '49.5 should be marked as new personal best');
  assert(completeData.personalBest === 49.5, 'personalBest should be 49.5');

  // Now immediately check leaderboard: Alice must be ranked at the exact same rank as completeData.globalRank!
  const lbAfterRes = await fetch(`${API_BASE}/api/leaderboard?period=all&limit=50`);
  const lbAfterData = await lbAfterRes.json();
  const aliceAfter = lbAfterData.entries.find(e => e.username === names[0]);

  console.log(`Leaderboard rank after completion: #${aliceAfter.rank}`);
  assert(aliceAfter.rank === completeData.globalRank, `Final results rank (#${completeData.globalRank}) must equal leaderboard rank (#${aliceAfter.rank})`);
  assert(aliceAfter.score === 49.5, `Alice score on leaderboard must be 49.5`);
  console.log('✅ Check passed: Final results rank EXACTLY matches GET /api/leaderboard rank!');

  // 8. Test Percentile with Tied Players (Bob and Charlie)
  console.log('\n--- 8. Verifying Percentile for Tied Players ---');
  const statsBob = await (await fetch(`${API_BASE}/api/users/${users[names[1]]}/stats`)).json();
  const statsCharlie = await (await fetch(`${API_BASE}/api/users/${users[names[2]]}/stats`)).json();

  console.log(`Bob (48.0) Percentile: ${statsBob.percentile}%`);
  console.log(`Charlie (48.0) Percentile: ${statsCharlie.percentile}%`);
  assert(statsBob.percentile === statsCharlie.percentile, `Tied players must have the identical percentile! Bob: ${statsBob.percentile}%, Charlie: ${statsCharlie.percentile}%`);
  console.log('✅ Check passed: Tied scores produce identical percentiles.');

  console.log('\n================================================================');
  console.log('       ALL 8 AUDIT & VERIFICATION GATES PASSED PERFECTLY!       ');
  console.log('================================================================\n');
}

runRankingSystemAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
