import { test } from '@japa/runner';

/**
 * Integration test to verify multi-tenant isolation:
 * A user from organisation B cannot access a supplier
 * belonging to organisation A.
 *
 * Relies on the existing seed data:
 * - Alice (Owner, Acme)
 * - Charlie (Analyst, Globex)
 */

async function login(client: any, email: string, password = 'password123'): Promise<string> {
  const response = await client.post('/api/auth/login').json({ email, password });

  response.assertStatus(200);

  const body = response.body();
  return body.data.token as string;
}

test.group('Multi-tenant isolation', () => {
  test('User from org B cannot read supplier from org A', async ({ client }) => {
    // Login as Alice (Owner, Acme Corp)
    const aliceToken = await login(client, 'alice@acme.com');

    // Fetch one supplier from Alice's organisation
    const suppliersResponse = await client.get('/api/suppliers').header('Authorization', `Bearer ${aliceToken}`).qs({ page: 1, limit: 1 });

    suppliersResponse.assertStatus(200);

    const suppliersBody = suppliersResponse.body();
    const supplier = suppliersBody.data?.[0];
    if (!supplier) {
      throw new Error('Expected at least one supplier for Acme Corp');
    }

    const supplierId = supplier.id as string;

    // Login as Charlie (Analyst, Globex Industries)
    const charlieToken = await login(client, 'charlie@globex.com');

    // Charlie should NOT be able to see Acme supplier details
    const forbiddenResponse = await client.get(`/api/suppliers/${supplierId}`).header('Authorization', `Bearer ${charlieToken}`);

    forbiddenResponse.assertStatus(404);
    forbiddenResponse.assertBodyContains({
      success: false,
      statusCode: 404
    });
  });
});
