import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data/db');

let pgInstance = null;

export async function ensurePostgresRunning() {
  // If already initialized in this process
  if (pgInstance) return pgInstance;

  try {
    // Check if postgres is already running on port 5432
    const net = await import('net');
    const isPortOpen = await new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(1000);
      client.connect(5432, '127.0.0.1', () => {
        client.destroy();
        resolve(true);
      });
      client.on('error', () => {
        client.destroy();
        resolve(false);
      });
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });

    if (isPortOpen) {
      console.log('✓ PostgreSQL already running on port 5432.');
      return null;
    }

    console.log('🐘 Starting embedded PostgreSQL on port 5432...');
    pgInstance = new EmbeddedPostgres({
      databaseDir: dataDir,
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'huedb',
      persistent: true
    });

    try {
      await pgInstance.initialise();
    } catch {
      // Already initialized
    }
    await pgInstance.start();
    try {
      await pgInstance.createDatabase('huedb');
    } catch {
      // Already exists
    }
    console.log('✓ Embedded PostgreSQL active on port 5432 (database: huedb).');
    return pgInstance;
  } catch (err) {
    console.warn('⚠️ Could not start embedded PostgreSQL:', err?.message || err);
    return null;
  }
}

export async function stopPostgres() {
  if (pgInstance) {
    console.log('Stopping embedded PostgreSQL...');
    await pgInstance.stop();
    pgInstance = null;
  }
}
