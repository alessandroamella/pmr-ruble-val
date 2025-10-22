import { join } from 'node:path';
import { ROOT_PATH } from 'server/paths';

export const CURRENCIES_CSV_DATA_DIR = join(ROOT_PATH, '/currency_data');

console.log(`Currencies CSV data directory set to: ${CURRENCIES_CSV_DATA_DIR}`);
