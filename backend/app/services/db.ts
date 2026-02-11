import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import env from '#start/env'
import type { Database } from '@shared'

/**
 * Singleton Kysely instance for the AdonisJS application.
 * Uses validated environment variables from AdonisJS Env service.
 *
 * For standalone scripts (migrations, seeds), use database/connection.ts instead.
 */
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD'),
      database: env.get('DB_DATABASE'),
      max: 10,
    }),
  }),
})

export default db
