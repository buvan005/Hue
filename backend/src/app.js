import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import prisma from './utils/prisma.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/games.js';
import leaderboardRoutes from './routes/leaderboard.js';
import statsRoutes from './routes/stats.js';

export function buildApp(opts = {}) {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = Fastify({
    logger: opts.logger !== undefined ? opts.logger : { level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'warn') },
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

  // Strict, environment-driven CORS configuration
  const rawOrigins = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, server-to-server, health checkers)
      if (!origin) return cb(null, true);

      if (isProduction) {
        if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error('CORS origin denied'), false);
      }

      // Development / Test: allow localhost and loopback interfaces
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }

      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Global rate limiting (120 requests/min per IP by default)
  app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again later.`
    })
  });

  // Health endpoint (Liveness probe)
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'hue-api',
      timestamp: new Date().toISOString()
    };
  });

  // Readiness endpoint (Database connectivity probe)
  app.get('/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      app.log.error({ err }, 'Readiness check failed');
      return reply.status(503).send({
        status: 'unavailable',
        database: 'disconnected',
        message: 'Database check failed'
      });
    }
  });

  // API Route Prefix
  app.register(async (api) => {
    api.register(userRoutes);
    api.register(gameRoutes);
    api.register(leaderboardRoutes);
    api.register(statsRoutes);
  }, { prefix: '/api' });

  // Custom global error handler (production-sanitized)
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, reqId: request.id }, 'Internal server error');
    } else {
      app.log.warn({ err: error, reqId: request.id }, 'Client request rejected');
    }

    const message = isClientError
      ? error.message
      : (isProduction ? 'An unexpected internal error occurred.' : error.message);

    reply.status(statusCode).send({
      statusCode,
      error: error.name || (statusCode === 429 ? 'Too Many Requests' : 'Internal Server Error'),
      message
    });
  });

  return app;
}
