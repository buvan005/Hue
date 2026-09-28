import 'dotenv/config';
import { ensurePostgresRunning } from './embedded-db.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

async function setup() {
  await ensurePostgresRunning();
  console.log('🔄 Pushing Prisma schema to PostgreSQL database...');
  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: backendDir,
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Database schema in sync with PostgreSQL!');
  } catch (err) {
    console.error('❌ Failed to push schema:', err.message);
  }
}

setup().then(() => {
  console.log('Done setup.');
  process.exit(0);
});
