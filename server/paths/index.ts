import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from 'server/utils/logger';

/**
 * Walks up from this module's directory until it finds the project's
 * package.json. Works both from source (tsx, `server/paths/`) and from the
 * bundled build (`dist/`), regardless of NODE_ENV.
 */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find project root from ${startDir}`);
    }
    dir = parent;
  }
  return dir;
}

export const ROOT_PATH = findProjectRoot(import.meta.dirname);

logger.info(`Project root path resolved to: ${ROOT_PATH}`);
