import { bool, cleanEnv, num, str } from 'envalid';

import 'dotenv/config';

export const envs = cleanEnv(process.env, {
  SERVER_PORT: num(),
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  DATABASE_URL: str({ default: 'file:rates.db' }),
  RUN_ON_STARTUP: bool({ default: false }),
  PARALLEL_FETCHES: num({ default: 3 }),
  TAKE_SCREENSHOTS: bool({ default: false }),
  PUPPETEER_HEADLESS: bool({ default: true }),
  REDIS_URL: str(),
  REDIS_KEY_PREFIX: str({ default: 'pmr-ruble-val:' }),
  CHROMIUM_PATH: str({ default: '' }),
});
