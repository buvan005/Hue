import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string({ required_error: 'Username is required', invalid_type_error: 'Username must be a string' })
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
});

export const startGameSchema = z.object({
  userId: z.string({ required_error: 'userId is required' }).uuid('Invalid user ID format'),
  mode: z.enum(['standard', 'daily'], { invalid_type_error: 'Invalid game mode' }).optional().default('standard')
});

export const gameParamsSchema = z.object({
  gameId: z.string().uuid('Invalid game ID format')
});

export const userParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

export const submitRoundSchema = z.object({
  roundNumber: z.number({ required_error: 'roundNumber is required' }).int().min(1, 'Round number must be between 1 and 5').max(5, 'Round number must be between 1 and 5'),
  guess: z.object({
    h: z.number({ required_error: 'Hue (h) is required' }).min(0, 'Hue must be >= 0').max(360, 'Hue must be <= 360'),
    s: z.number({ required_error: 'Saturation (s) is required' }).min(0, 'Saturation must be >= 0').max(100, 'Saturation must be <= 100'),
    b: z.number({ required_error: 'Brightness (b) is required' }).min(0, 'Brightness must be >= 0').max(100, 'Brightness must be <= 100')
  }, { required_error: 'Guess object is required' }),
  userId: z.string().uuid('Invalid user ID format').optional()
});

export const completeGameSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional()
}).optional().default({});

export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional().default(50),
  period: z.enum(['all', 'daily', 'weekly', 'today', 'week'], { invalid_type_error: 'Invalid period parameter' }).optional().default('all')
});

function formatZodError(err) {
  return err.errors.map((e) => e.message).join(', ');
}

export function validateBody(schema) {
  return async (request, reply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: formatZodError(err)
        });
      }
      throw err;
    }
  };
}

export function validateParams(schema) {
  return async (request, reply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: formatZodError(err)
        });
      }
      throw err;
    }
  };
}

export function validateQuery(schema) {
  return async (request, reply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: formatZodError(err)
        });
      }
      throw err;
    }
  };
}
