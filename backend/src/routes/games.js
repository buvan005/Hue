import { createGame, submitRound, completeGame } from '../services/gameService.js';
import {
  validateBody,
  validateParams,
  startGameSchema,
  gameParamsSchema,
  submitRoundSchema,
  completeGameSchema
} from '../middleware/validation.js';

export default async function gameRoutes(fastify) {
  // POST /api/games — Start a new 5-round game session
  fastify.post(
    '/games',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute'
        }
      },
      preHandler: validateBody(startGameSchema)
    },
    async (request, reply) => {
      const { userId, mode } = request.body;
      const gameSession = await createGame(userId, mode);
      return reply.status(201).send(gameSession);
    }
  );

  // POST /api/games/:gameId/rounds — Submit a round's HSB guess
  fastify.post(
    '/games/:gameId/rounds',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute'
        }
      },
      preHandler: [
        validateParams(gameParamsSchema),
        validateBody(submitRoundSchema)
      ]
    },
    async (request, reply) => {
      const { gameId } = request.params;
      const { roundNumber, guess, userId } = request.body;
      const result = await submitRound(gameId, roundNumber, guess, userId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/games/:gameId/complete — Complete game session & tally authoritative scores
  fastify.post(
    '/games/:gameId/complete',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute'
        }
      },
      preHandler: [
        validateParams(gameParamsSchema),
        validateBody(completeGameSchema)
      ]
    },
    async (request, reply) => {
      const { gameId } = request.params;
      const { userId } = request.body || {};
      const summary = await completeGame(gameId, userId);
      return reply.status(200).send(summary);
    }
  );
}
