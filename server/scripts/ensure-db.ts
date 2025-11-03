import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_PATH } from 'server/paths';
import { logger } from 'server/utils/logger';

// Get the DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  logger.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// Extract the file path from the DATABASE_URL
// Format: "file:rates.db" or "file:./rates.db" or "file:/absolute/path/to/rates.db"
const dbPath = dbUrl.replace(/^file:/, '');

// Resolve the path relative to the project root
const projectRoot = ROOT_PATH;
const absoluteDbPath = dbPath.startsWith('/')
  ? dbPath
  : join(projectRoot, dbPath);

logger.info(`🔍 Checking for database file: ${absoluteDbPath}`);

if (!existsSync(absoluteDbPath)) {
  logger.info('⚠️  Database file not found. Running db:push-schema...');

  try {
    execSync('pnpm db:push-schema', {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    logger.info('✅ Database schema pushed successfully');
  } catch {
    logger.error('❌ Failed to push database schema');
    process.exit(1);
  }
} else {
  logger.info('✅ Database file exists, skipping schema push');
}
