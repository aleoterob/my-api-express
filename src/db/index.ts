import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as profilesSchema from './schema/public/profiles';
import { users, authSchema } from './schema/auth/users';
import { refreshTokens } from './schema/auth/refresh_tokens';
import * as relations from './relations';

const schema = {
  ...profilesSchema,
  users,
  refreshTokens,
  authSchema,
};

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(connectionString);

export const db = drizzle(sql, {
  schema: {
    ...schema,
    ...relations,
  },
});

export * from './schema/public/profiles';
export * from './schema/auth/refresh_tokens';
