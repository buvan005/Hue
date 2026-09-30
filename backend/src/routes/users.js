import { findOrCreateUser } from '../services/userService.js';
import { validateBody, createUserSchema } from '../middleware/validation.js';

export default async function userRoutes(fastify) {
  // POST /api/users — Create or fetch a user by valid username
  fastify.post(
    '/users',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute'
        }
      },
      preHandler: validateBody(createUserSchema)
    },
    async (request, reply) => {
      const { username } = request.body;
      const user = await findOrCreateUser(username);
      return reply.status(200).send(user);
    }
  );
}
