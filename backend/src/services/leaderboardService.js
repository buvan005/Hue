import prisma from '../utils/prisma.js';

/**
 * Returns the date boundary for the requested period.
 * 
 * - 'today' / 'daily': Games completed today (or within the rolling 24-hour window / start of local or UTC day).
 * - 'week' / 'weekly': Games completed within the last 7 rolling days.
 * - 'all': All completed games (no date filter).
 * 
 * @param {string} period
 * @returns {Date | null}
 */
export function getPeriodStartDate(period = 'all') {
  const p = (period || 'all').toLowerCase();
  const now = new Date();

  if (p === 'daily' || p === 'today') {
    const startOfLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return new Date(Math.min(startOfLocalDay.getTime(), startOfUtcDay.getTime(), twentyFourHoursAgo.getTime()));
  }

  if (p === 'weekly' || p === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Builds the authoritative, sorted leaderboard of unique players for a period.
 * 
 * Guarantees:
 * 1. Exactly ONE row per unique user (playerBestScore = MAX(total_score) among COMPLETED games in period).
 * 2. Identified best_score_game_id and best_score_completed_at.
 * 3. Authoritative tie-breaker:
 *    - higher personal-best score first (bestScore DESC)
 *    - earlier achieved timestamp first (bestScoreCompletedAt ASC)
 *    - deterministic fallback (userId ASC)
 * 4. Consistent rank (1-based index).
 * 5. Consistent percentile / "BETTER THAN":
 *    strictly lower unique players / total unique players * 100
 * 
 * @param {'all' | 'weekly' | 'daily'} period
 * @returns {Promise<Array<{
 *   userId: string,
 *   username: string,
 *   bestScore: number,
 *   bestScoreGameId: string,
 *   bestScoreCompletedAt: Date,
 *   rank: number,
 *   percentile: number,
 *   percentageLower: number,
 *   totalPlayers: number
 * }>>}
 */
export async function buildPlayerLeaderboard(period = 'all') {
  const startDate = getPeriodStartDate(period);

  const where = {
    status: 'COMPLETED'
  };

  if (startDate) {
    where.completed_at = { gte: startDate };
  }

  // Fetch all completed games for the period, ordered by score desc, completed_at asc, id asc
  const games = await prisma.game.findMany({
    where,
    orderBy: [
      { total_score: 'desc' },
      { completed_at: 'asc' },
      { id: 'asc' }
    ],
    include: {
      user: {
        select: { id: true, username: true }
      }
    }
  });

  // Group by user_id to extract the single best qualifying game per user
  const userMap = new Map();

  for (const g of games) {
    if (!userMap.has(g.user_id)) {
      userMap.set(g.user_id, {
        userId: g.user_id,
        username: g.user?.username || 'anonymous',
        bestScore: g.total_score,
        bestScoreGameId: g.id,
        bestScoreCompletedAt: g.completed_at
      });
    }
  }

  const uniquePlayers = Array.from(userMap.values());

  // Authoritative sort:
  // 1. bestScore DESC
  // 2. bestScoreCompletedAt ASC
  // 3. userId ASC
  uniquePlayers.sort((a, b) => {
    if (b.bestScore !== a.bestScore) {
      return b.bestScore - a.bestScore;
    }
    const timeA = new Date(a.bestScoreCompletedAt).getTime();
    const timeB = new Date(b.bestScoreCompletedAt).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.userId.localeCompare(b.userId);
  });

  const totalPlayers = uniquePlayers.length;

  // Assign sequential rank and percentile based on unique players
  // Rule:
  // percentile = (number of unique players with strictly lower best score) / (total number of unique players) * 100
  const rankedLeaderboard = uniquePlayers.map((player, index) => {
    const rank = index + 1;
    const strictlyLowerCount = uniquePlayers.filter((p) => p.bestScore < player.bestScore).length;
    const percentile = totalPlayers > 0
      ? Math.round((strictlyLowerCount / totalPlayers) * 100)
      : 0;

    return {
      userId: player.userId,
      username: player.username,
      bestScore: player.bestScore,
      bestScoreGameId: player.bestScoreGameId,
      bestScoreCompletedAt: player.bestScoreCompletedAt,
      rank,
      percentile,
      percentageLower: percentile,
      totalPlayers
    };
  });

  return rankedLeaderboard;
}

/**
 * Retrieves rank and percentile for a specific player from the authoritative leaderboard.
 * 
 * @param {string} userId
 * @param {'all' | 'weekly' | 'daily'} period
 * @returns {Promise<{
 *   rank: number | null,
 *   globalRank: number | null,
 *   percentile: number | null,
 *   percentageLower: number | null,
 *   bestScore: number | null,
 *   bestScoreGameId: string | null,
 *   bestScoreCompletedAt: Date | null,
 *   totalPlayers: number,
 *   averagePlayerScore: number
 * }>}
 */
export async function getPlayerRankAndPercentile(userId, period = 'all') {
  const leaderboard = await buildPlayerLeaderboard(period);
  const totalPlayers = leaderboard.length;

  const avgScore = totalPlayers > 0
    ? Number((leaderboard.reduce((acc, p) => acc + p.bestScore, 0) / totalPlayers).toFixed(1))
    : 0;

  const playerEntry = leaderboard.find((p) => p.userId === userId);

  if (!playerEntry) {
    return {
      rank: null,
      globalRank: null,
      percentile: null,
      percentageLower: null,
      bestScore: null,
      bestScoreGameId: null,
      bestScoreCompletedAt: null,
      totalPlayers,
      averagePlayerScore: avgScore
    };
  }

  return {
    rank: playerEntry.rank,
    globalRank: playerEntry.rank,
    percentile: playerEntry.percentile,
    percentageLower: playerEntry.percentageLower,
    bestScore: playerEntry.bestScore,
    bestScoreGameId: playerEntry.bestScoreGameId,
    bestScoreCompletedAt: playerEntry.bestScoreCompletedAt,
    totalPlayers,
    averagePlayerScore: avgScore
  };
}

/**
 * Standard Leaderboard API endpoint handler.
 * Returns paginated unique players matching the authoritative model.
 * 
 * @param {{ page?: number, limit?: number, period?: string }} options
 */
export async function getLeaderboard({ page = 1, limit = 50, period = 'all' } = {}) {
  const leaderboard = await buildPlayerLeaderboard(period);
  const totalPlayers = leaderboard.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const paged = leaderboard.slice(skip, skip + limitNum);

  const entries = paged.map((p) => ({
    rank: p.rank,
    userId: p.userId,
    username: p.username,
    score: p.bestScore,
    total_score: p.bestScore, // backward compatibility
    gameId: p.bestScoreGameId,
    achievedAt: p.bestScoreCompletedAt,
    completedAt: p.bestScoreCompletedAt
  }));

  return {
    period: (period || 'all').toLowerCase(),
    entries,
    page: pageNum,
    limit: limitNum,
    total: totalPlayers,
    totalPlayers,
    totalPages: Math.ceil(totalPlayers / limitNum) || 1
  };
}
