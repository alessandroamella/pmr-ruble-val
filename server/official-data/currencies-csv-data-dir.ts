import { join } from 'node:path';
import { ROOT_PATH } from 'server/paths';
import { logger } from 'server/utils/logger';

export const CURRENCIES_CSV_DATA_DIR = join(ROOT_PATH, '/currency_data');

logger.info(`Currencies CSV data directory set to: ${CURRENCIES_CSV_DATA_DIR}`);
