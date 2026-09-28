import { createGame, submitRound, completeGame } from '../services/gameService.js';
import { validateBody, startGameSchema, submitRoundSchema } from '../middleware/validation.js';

export default async function gameRoutes(fastify) {
  // POST /api/games — Start a new 5-round game session
  fastify.post(
    '/games',
    { preHandler: validateBody(startGameSchema) },
    async (request, reply) => {
      const { userId, mode } = request.body;
      const gameSession = await createGame(userId, mode);
      return reply.status(201).send(gameSession);
    }
  );

  // POST /api/games/:gameId/rounds — Submit a round's HSB guess
  fastify.post(
    '/games/:gameId/rounds',
    { preHandler: validateBody(submitRoundSchema) },
    async (request, reply) => {
      const { gameId } = request.params;
      const { roundNumber, guess } = request.body;
      const result = await submitRound(gameId, roundNumber, guess);
      return reply.status(200).send(result);
    }
  );

  // POST /api/games/:gameId/complete — Complete game session & tally authoritative scores
  fastify.post('/games/:gameId/complete', async (request, reply) => {
    const { gameId } = request.params;
    const summary = await completeGame(gameId);
    return reply.status(200).send(summary);
  });
}
