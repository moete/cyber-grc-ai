import db from '#services/db';

/**
 * Delete an organisation and all its data (users, suppliers, audit_logs).
 * Owner only. Deletion order respects FKs: audit_logs (refs org + user), then users, suppliers, org.
 */
export async function deleteOrganisation(organizationId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('audit_logs').where('organization_id', '=', organizationId).execute();
    await trx.deleteFrom('users').where('organization_id', '=', organizationId).execute();
    await trx.deleteFrom('suppliers').where('organization_id', '=', organizationId).execute();
    await trx.deleteFrom('organisations').where('id', '=', organizationId).execute();
  });
}
