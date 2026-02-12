import { apiDelete } from '@/lib/api'

export function deleteCurrentOrganisation() {
  return apiDelete<{ success: true; message?: string }>('/api/organisations/current')
}
