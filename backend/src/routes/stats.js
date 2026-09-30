import { getPlayerStats } from '../services/statsService.js';
import { validateParams, userParamsSchema } from '../middleware/validation.js';

export default async function statsRoutes(fastify) {
  // GET /api/users/:userId/stats
  fastify.get(
    '/users/:userId/stats',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute'
        }
      },
      preHandler: validateParams(userParamsSchema)
    },
    async (request, reply) => {
      const { userId } = request.params;
      const stats = await getPlayerStats(userId);
      return reply.status(200).send(stats);
    }
  );
}
