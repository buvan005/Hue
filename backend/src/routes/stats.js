import { getPlayerStats } from '../services/statsService.js';

export default async function statsRoutes(fastify) {
  // GET /api/users/:userId/stats
  fastify.get('/users/:userId/stats', async (request, reply) => {
    const { userId } = request.params;
    const stats = await getPlayerStats(userId);
    return reply.status(200).send(stats);
  });
}
