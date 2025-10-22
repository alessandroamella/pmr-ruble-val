import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { envs } from 'server/config/envs';
import * as schema from './schema';

const client = createClient({
  url: envs.DATABASE_URL,
});

export const db = drizzle(client, { schema, logger: true }); // logger is great for dev
