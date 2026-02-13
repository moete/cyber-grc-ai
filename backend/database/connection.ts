/**
 * Standalone database connection factory for scripts that run
 * outside the AdonisJS boot cycle (migrations, seeds, one-off scripts).
 *
 * Loads env from .env via dotenv. Does NOT depend on AdonisJS services.
 */
import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from '@shared';

export function createDb(overrides?: Partial<pg.PoolConfig>): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: overrides?.user ?? process.env.DB_USER ?? 'postgres',
        password: overrides?.password ?? (process.env.DB_PASSWORD || 'postgres'),
        database: process.env.DB_DATABASE ?? 'cyber_grc',
        max: 5,
        ...overrides
      })
    })
  });
}
