/**
 * Kysely migration runner — standalone script.
 *
 * Usage:
 *   tsx database/migrator.ts          # migrate to latest
 *   tsx database/migrator.ts down     # rollback last migration
 *   tsx database/migrator.ts fresh    # drop all tables + re-migrate from scratch
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sql, Migrator } from 'kysely'
import type { Kysely, MigrationProvider, Migration } from 'kysely'
import { createDb } from './connection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Custom migration provider that converts file paths to file:// URLs
 * before calling import(). Required on Windows where absolute paths
 * like C:\... are rejected by the ESM loader.
 */
class ESMFileMigrationProvider implements MigrationProvider {
  private folder: string

  constructor(folder: string) {
    this.folder = folder
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {}
    const files = await fs.readdir(this.folder)

    for (const file of files.sort()) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

      const filePath = path.join(this.folder, file)
      // Convert to file:// URL — required for Windows ESM compatibility
      const fileUrl = pathToFileURL(filePath).href
      const migration = await import(fileUrl)

      const name = file.replace(/\.(ts|js)$/, '')
      migrations[name] = migration
    }

    return migrations
  }
}

async function main() {
  // Migrations always run as superuser (postgres) to manage schema + RLS
  const db = createDb({ user: 'postgres', password: 'postgres' })

  const migrator = new Migrator({
    db,
    provider: new ESMFileMigrationProvider(path.join(__dirname, 'migrations')),
  })

  const direction = process.argv[2]

  // ── fresh: nuke everything and re-migrate ─────────────────
  if (direction === 'fresh') {
    console.log('Dropping all tables...')
    await dropAllTables(db)
    console.log('  ✓ All tables dropped.\n')

    const { error, results } = await migrator.migrateToLatest()
    results?.forEach((r: any) => {
      const icon = r.status === 'Success' ? '↑' : '✗'
      console.log(`  ${icon} ${r.migrationName} — ${r.status}`)
    })
    if (error) {
      console.error('\nMigration failed:', error)
      process.exit(1)
    }
    console.log('\nFresh migration complete.')
  } else if (direction === 'down') {
    const { error, results } = await migrator.migrateDown()
    results?.forEach((r: any) => {
      const icon = r.status === 'Success' ? '↓' : '✗'
      console.log(`  ${icon} ${r.migrationName} — ${r.status}`)
    })
    if (error) {
      console.error('\nMigration rollback failed:', error)
      process.exit(1)
    }
    console.log('\nRollback complete.')
  } else {
    const { error, results } = await migrator.migrateToLatest()
    results?.forEach((r: any) => {
      const icon = r.status === 'Success' ? '↑' : '✗'
      console.log(`  ${icon} ${r.migrationName} — ${r.status}`)
    })
    if (error) {
      console.error('\nMigration failed:', error)
      process.exit(1)
    }
    console.log('\nAll migrations applied.')
  }

  await db.destroy()
}

/**
 * Drop all tables in the public schema (including Kysely's migration tracking tables).
 * Used by the `fresh` command to start from a clean slate.
 */
async function dropAllTables(db: Kysely<any>) {
  // Disable RLS policies first so drops don't fail
  const tables = await sql<{ tablename: string }>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `.execute(db)

  for (const { tablename } of tables.rows) {
    await sql`DROP TABLE IF EXISTS ${sql.ref(tablename)} CASCADE`.execute(db)
  }
}

main()
