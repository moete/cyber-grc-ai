import type { HttpContext } from '@adonisjs/core/http'
import { deleted } from '#helpers/responses'
import { requireAccess } from '#helpers/access'
import { Permission } from '@shared'
import { deleteOrganisation } from '#services/organisation_service'

export default class OrganisationsController {
  /**
   * DELETE /api/organisations/current — delete the current user's organisation (Owner only).
   * Removes all users, suppliers and audit logs for that org.
   */
  async destroyCurrent({ auth, response }: HttpContext) {
    requireAccess(
      auth,
      auth.organizationId,
      Permission.ORG_DELETE,
      'You do not have permission to delete this organisation'
    )
    await deleteOrganisation(auth.organizationId)
    return deleted(response, 'Organisation deleted')
  }
}
