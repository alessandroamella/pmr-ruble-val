import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT_PATH } from 'server/paths';
import { logger } from 'server/utils/logger';

export const tmpDir = join(ROOT_PATH, './tmp');

export async function prepareTmpDir() {
  if (!existsSync(tmpDir)) {
    logger.info(`Creating temporary directory at: ${tmpDir}`);
    await mkdir(tmpDir, { recursive: true });
  } else {
    logger.info(`Temporary directory already exists at: ${tmpDir}`);
  }
}
