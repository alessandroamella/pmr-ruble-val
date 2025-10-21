import { bool, cleanEnv, num, str } from 'envalid';

import 'dotenv/config';

export const envs = cleanEnv(process.env, {
  SERVER_PORT: num(),
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  RUN_ON_STARTUP: bool({ default: false }),
  CSP_NONCE: str(),
  PARALLEL_FETCHES: num({ default: 3 }),
});
