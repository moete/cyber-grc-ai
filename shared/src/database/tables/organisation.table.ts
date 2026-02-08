import type { Generated } from 'kysely';

/**
 * Kysely table type for the `organisations` table.
 * Column names are snake_case to match PostgreSQL conventions.
 */
export interface OrganisationTable {
  id: Generated<string>;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
