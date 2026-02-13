import { test } from '@japa/runner';
import { AuditAction, ENTITY_TYPES } from '@shared';

/**
 * E2E (bonus): Login → create supplier → verify audit trail.
 *
 * Business invariant: every supplier creation must produce exactly one
 * CREATE audit log entry for that entity, scoped to the user's organisation.
 */

async function login(client: any, email: string, password = 'password123'): Promise<string> {
  const response = await client.post('/api/auth/login').json({ email, password });
  response.assertStatus(200);
  return response.body().data.token as string;
}

test.group('Audit trail E2E', () => {
  test('creating a supplier creates an audit log entry', async ({ client }) => {
    // Use Admin (Bob) — has SUPPLIER_CREATE and AUDIT_READ
    const token = await login(client, 'bob@acme.com');

    const createResponse = await client.post('/api/suppliers').header('Authorization', `Bearer ${token}`).json({
      name: 'E2E Test Supplier Ltd',
      domain: 'e2etest.example.com',
      category: 'SaaS',
      riskLevel: 'Low',
      status: 'Active'
    });

    createResponse.assertStatus(201);
    const supplier = createResponse.body().data as { id: string; organizationId: string };
    const supplierId = supplier.id;

    const auditResponse = await client
      .get('/api/audit-logs')
      .header('Authorization', `Bearer ${token}`)
      .qs({ entityType: ENTITY_TYPES.SUPPLIER, entityId: supplierId, limit: 10 });

    auditResponse.assertStatus(200);
    const auditBody = auditResponse.body();
    const logs = auditBody.data ?? [];

    const createLog = logs.find((l: { action: string; entityId: string }) => l.action === AuditAction.CREATE && l.entityId === supplierId);

    if (!createLog) {
      throw new Error(`Expected one CREATE audit entry for supplier ${supplierId}. Got: ${JSON.stringify(logs)}`);
    }
  });
});
