import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(20, 'Username must not exceed 20 characters')
});

export const startGameSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  mode: z.enum(['standard', 'daily']).optional().default('standard')
});

export const submitRoundSchema = z.object({
  roundNumber: z.number().int().min(1).max(5),
  guess: z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    b: z.number().min(0).max(100)
  })
});

export function validateBody(schema) {
  return async (request, reply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.errors.map((e) => e.message).join(', ')
        });
      } else {
        throw err;
      }
    }
  };
}
