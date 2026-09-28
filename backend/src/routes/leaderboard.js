import { getLeaderboard } from '../services/leaderboardService.js';

export default async function leaderboardRoutes(fastify) {
  // GET /api/leaderboard?page=1&limit=50&period=all|daily|weekly
  fastify.get('/leaderboard', async (request, reply) => {
    const { page, limit, period } = request.query;
    const data = await getLeaderboard({ page, limit, period });
    return reply.status(200).send(data);
  });
}
