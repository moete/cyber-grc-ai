import type { Roles } from '@shared'

export type UserWithOrgRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  password_hash: string
  role: Roles
  organization_id: string
  organization_name: string
  is_active?: boolean
  created_at?: Date
}
