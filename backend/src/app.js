import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/games.js';
import leaderboardRoutes from './routes/leaderboard.js';
import statsRoutes from './routes/stats.js';

export function buildApp(opts = {}) {
  const app = Fastify({
    logger: opts.logger !== undefined ? opts.logger : { level: 'info' },
    ...opts
  });

  // Sensible helpers
  app.register(sensible);

  // Allow empty body when Content-Type is application/json
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (!body || body.trim() === '') {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // CORS support
  app.register(cors, {
    origin: process.env.FRONTEND_URL || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Basic rate limiting (120 requests/min per IP)
  app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute'
  });

  // Health endpoint (Part 32 requirement)
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'hue-api',
      timestamp: new Date().toISOString()
    };
  });

  // API Route Prefix
  app.register(async (api) => {
    api.register(userRoutes);
    api.register(gameRoutes);
    api.register(leaderboardRoutes);
    api.register(statsRoutes);
  }, { prefix: '/api' });

  // Custom global error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    app.log.error(error);

    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: isClientError ? error.message : 'An unexpected error occurred.'
    });
  });

  return app;
}
