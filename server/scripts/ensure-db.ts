import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_PATH } from 'server/paths';
import { migrateCsvToDb } from './migrate-to-db';

// Get the DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
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

console.log(`🔍 Checking for database file: ${absoluteDbPath}`);

let dbPushed = false;
if (!existsSync(absoluteDbPath)) {
  console.log('⚠️  Database file not found. Running db:push-schema...');

  try {
    execSync('pnpm db:push-schema', {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    console.log('✅ Database schema pushed successfully');
    dbPushed = true;
  } catch {
    console.error('❌ Failed to push database schema');
    process.exit(1);
  }
} else {
  console.log('✅ Database file exists, skipping schema push');
}

// now try to push csv data to db
if (dbPushed) {
  console.log('🔄 Migrating CSV data to database...');
  migrateCsvToDb()
    .then(() => {
      console.log('✅ CSV data migration completed');
    })
    .catch((error) => {
      console.error('❌ CSV data migration failed:', error);
      process.exit(1);
    });
} else {
  console.log('ℹ️ Database schema already pushed, skipping CSV data migration');
}
