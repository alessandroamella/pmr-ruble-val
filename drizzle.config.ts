import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // The directory where migration files will be generated.
  out: './server/db/migrations',

  // The path to your schema file(s).
  schema: './server/db/schema.ts',

  // The database dialect.
  dialect: 'sqlite',

  // Connection details for drizzle-kit.
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // This is optional, but makes the output more readable.
  verbose: true,
});
