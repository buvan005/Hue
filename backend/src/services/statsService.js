import prisma from '../utils/prisma.js';
import { getPlayerRankAndPercentile } from './leaderboardService.js';

export async function getPlayerStats(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // Completed games for this user
  const userGames = await prisma.game.findMany({
    where: {
      user_id: userId,
      status: 'COMPLETED'
    },
    include: {
      rounds: { where: { score: { not: null } } }
    },
    orderBy: { total_score: 'desc' }
  });

  const gamesPlayed = userGames.length;

  // Authoritative ranking and percentile from shared Leaderboard Service
  const ranking = await getPlayerRankAndPercentile(userId, 'all');

  if (gamesPlayed === 0) {
    return {
      userId: user.id,
      username: user.username,
      gamesPlayed: 0,
      averageScore: 0,
      bestScore: 0,
      averagePlayerScore: ranking.averagePlayerScore,
      averageRoundScore: 0,
      bestRoundScore: 0,
      rank: null,
      globalRank: null,
      percentile: null,
      percentageLower: null,
      totalPlayers: ranking.totalPlayers,
      recentGames: []
    };
  }

  const bestScore = userGames[0].total_score;
  const totalPoints = userGames.reduce((acc, g) => acc + g.total_score, 0);
  const averageScore = Number((totalPoints / gamesPlayed).toFixed(2));

  // Compute round stats
  let totalRoundPoints = 0;
  let totalRoundsCount = 0;
  let bestRoundScore = 0;

  for (const g of userGames) {
    for (const r of g.rounds) {
      if (r.score !== null) {
        totalRoundPoints += r.score;
        totalRoundsCount++;
        if (r.score > bestRoundScore) {
          bestRoundScore = r.score;
        }
      }
    }
  }

  const averageRoundScore = totalRoundsCount > 0
    ? Number((totalRoundPoints / totalRoundsCount).toFixed(2))
    : 0;

  // Recent 5 games (ordered by completed_at desc)
  const gamesByDate = [...userGames].sort((a, b) => {
    const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return tb - ta;
  });

  const recentGames = gamesByDate.slice(0, 5).map((g) => ({
    gameId: g.id,
    score: g.total_score,
    mode: g.mode,
    completedAt: g.completed_at
  }));

  return {
    userId: user.id,
    username: user.username,
    gamesPlayed,
    averageScore,
    bestScore,
    averagePlayerScore: ranking.averagePlayerScore,
    averageRoundScore,
    bestRoundScore,
    rank: ranking.rank,
    globalRank: ranking.globalRank,
    percentile: ranking.percentile,
    percentageLower: ranking.percentageLower,
    totalPlayers: ranking.totalPlayers,
    recentGames
  };
}
