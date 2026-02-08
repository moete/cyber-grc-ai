import type { Generated } from 'kysely';

/**
 * Kysely table type for the `users` table.
 * `password_hash` is stored in DB but never exposed in business interfaces.
 */
export interface UserTable {
  id: Generated<string>;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  role: string;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
