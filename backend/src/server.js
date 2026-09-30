import 'dotenv/config';
import { buildApp } from './app.js';
import prisma from './utils/prisma.js';
import { ensurePostgresRunning, stopPostgres } from './embedded-db.js';

const isProduction = process.env.NODE_ENV === 'production';
const app = buildApp({
  logger: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'warn')
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const useEmbeddedDb = !isProduction &&
  process.env.USE_EMBEDDED_DB !== 'false' &&
  Boolean(process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1'));

async function start() {
  try {
    if (useEmbeddedDb) {
      await ensurePostgresRunning();
    }
    await prisma.$connect();
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 HUE Fastify Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Readiness check: http://localhost:${PORT}/ready\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    await app.close();
    await prisma.$disconnect();
    if (useEmbeddedDb) {
      await stopPostgres();
    }
    console.log('Server and database connections safely closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
