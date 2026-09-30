import { getLeaderboard } from '../services/leaderboardService.js';
import { validateQuery, leaderboardQuerySchema } from '../middleware/validation.js';

export default async function leaderboardRoutes(fastify) {
  // GET /api/leaderboard?page=1&limit=50&period=all|daily|weekly
  fastify.get(
    '/leaderboard',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute'
        }
      },
      preHandler: validateQuery(leaderboardQuerySchema)
    },
    async (request, reply) => {
      const { page, limit, period } = request.query;
      const data = await getLeaderboard({ page, limit, period });
      return reply.status(200).send(data);
    }
  );
}
