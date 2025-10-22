import { join } from 'node:path';
import { envs } from 'server/config/envs';

export const CURRENCIES_CSV_DATA_DIR = join(
  import.meta.dirname,
  `${envs.NODE_ENV === 'production' ? '' : '../'}../currency_data`,
);

console.log(`Currencies CSV data directory set to: ${CURRENCIES_CSV_DATA_DIR}`);
