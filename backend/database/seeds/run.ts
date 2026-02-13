/**
 * Seed script — populates the database with development data.
 *
 * Creates:
 *   - 2 organisations (Acme Corp, Globex Industries)
 *   - 4 users (one per role, split across orgs)
 *   - 15 suppliers (10 in Acme, 5 in Globex)
 *
 * All users have password: password123
 *
 * Usage:
 *   npm run seed   (or: npx tsx database/seeds/run.ts)
 *
 * With Docker (same DB as backend):
 *   docker compose exec backend npm run seed
 */
import 'dotenv/config';
import { sql } from 'kysely';
import { createDb } from '../connection.js';
import { Roles } from '@shared';
import { hashPassword } from '@shared/functions/hash';

async function seed() {
  // Seed runs as postgres superuser to bypass RLS
  const db = createDb({ user: 'postgres', password: 'postgres' });

  console.log('Seeding database...\n');

  // ── Clean existing data (idempotent re-runs) ───────────────
  // audit_logs has rules and FKs to organisations/users. To avoid
  // referential integrity errors, we truncate ALL related tables
  // in a single statement with CASCADE.
  await db.executeQuery(
    sql`
      TRUNCATE TABLE audit_logs, suppliers, users, organisations
      RESTART IDENTITY CASCADE
    `.compile(db)
  );

  // ── Organisations ──────────────────────────────────────────
  const [orgA, orgB] = await db
    .insertInto('organisations')
    .values([{ name: 'Acme Corp' }, { name: 'Globex Industries' }])
    .returningAll()
    .execute();

  console.log(`  ✓ Organisations: ${orgA.name} (${orgA.id}), ${orgB.name} (${orgB.id})`);

  // ── Users ──────────────────────────────────────────────────
  // All same password so one hash can be reused; is_active explicit so login always works.
  const pw = hashPassword('password123');
  const usersPayload = [
    {
      organization_id: orgA.id,
      email: 'alice@acme.com',
      first_name: 'Alice',
      last_name: 'Martin',
      password_hash: pw,
      role: Roles.OWNER,
      is_active: true
    },
    {
      organization_id: orgA.id,
      email: 'bob@acme.com',
      first_name: 'Bob',
      last_name: 'Dupont',
      password_hash: pw,
      role: Roles.ADMIN,
      is_active: true
    },
    {
      organization_id: orgB.id,
      email: 'charlie@globex.com',
      first_name: 'Charlie',
      last_name: 'Bernard',
      password_hash: pw,
      role: Roles.ANALYST,
      is_active: true
    },
    {
      organization_id: orgB.id,
      email: 'diana@globex.com',
      first_name: 'Diana',
      last_name: 'Rousseau',
      password_hash: pw,
      role: Roles.AUDITOR,
      is_active: true
    }
  ];
  const users = await db.insertInto('users').values(usersPayload).returningAll().execute();

  for (const u of users) {
    console.log(`  ✓ User: ${u.first_name} ${u.last_name} (${u.role}) — ${u.email}`);
  }

  // ── Suppliers ──────────────────────────────────────────────
  const suppliersData = [
    // --- Acme Corp suppliers (10) ---
    {
      organization_id: orgA.id,
      name: 'CloudFlare',
      domain: 'cloudflare.com',
      category: 'Infrastructure',
      risk_level: 'Low',
      status: 'Active',
      notes: 'CDN and DDoS protection provider'
    },
    {
      organization_id: orgA.id,
      name: 'Salesforce',
      domain: 'salesforce.com',
      category: 'SaaS',
      risk_level: 'Medium',
      status: 'Active',
      notes: 'CRM platform'
    },
    {
      organization_id: orgA.id,
      name: 'AWS',
      domain: 'aws.amazon.com',
      category: 'Infrastructure',
      risk_level: 'Low',
      status: 'Active',
      notes: 'Primary cloud provider',
      contract_end_date: new Date('2027-06-30')
    },
    {
      organization_id: orgA.id,
      name: 'Datadog',
      domain: 'datadoghq.com',
      category: 'SaaS',
      risk_level: 'Medium',
      status: 'Active',
      notes: 'Monitoring and observability'
    },
    {
      organization_id: orgA.id,
      name: 'Deloitte Cyber',
      domain: 'deloitte.com',
      category: 'Consulting',
      risk_level: 'Low',
      status: 'Active',
      notes: 'Annual penetration testing',
      contract_end_date: new Date('2026-12-31')
    },
    {
      organization_id: orgA.id,
      name: 'Slack',
      domain: 'slack.com',
      category: 'SaaS',
      risk_level: 'Medium',
      status: 'Under Review',
      notes: 'Internal communication — reviewing data residency'
    },
    {
      organization_id: orgA.id,
      name: 'CrowdStrike',
      domain: 'crowdstrike.com',
      category: 'SaaS',
      risk_level: 'Low',
      status: 'Active',
      notes: 'Endpoint detection and response'
    },
    {
      organization_id: orgA.id,
      name: 'Accenture Security',
      domain: 'accenture.com',
      category: 'Consulting',
      risk_level: 'Medium',
      status: 'Active'
    },
    {
      organization_id: orgA.id,
      name: 'LegacySoft',
      domain: 'legacysoft.io',
      category: 'Other',
      risk_level: 'Critical',
      status: 'Under Review',
      notes: 'Legacy vendor — end-of-life product, urgent review needed'
    },
    {
      organization_id: orgA.id,
      name: 'DigitalOcean',
      domain: 'digitalocean.com',
      category: 'Infrastructure',
      risk_level: 'High',
      status: 'Inactive',
      notes: 'Migrated to AWS — contract expired'
    },

    // --- Globex Industries suppliers (5) ---
    {
      organization_id: orgB.id,
      name: 'Google Cloud',
      domain: 'cloud.google.com',
      category: 'Infrastructure',
      risk_level: 'Low',
      status: 'Active',
      notes: 'Primary cloud provider for Globex'
    },
    {
      organization_id: orgB.id,
      name: 'Jira Cloud',
      domain: 'atlassian.com',
      category: 'SaaS',
      risk_level: 'Medium',
      status: 'Active',
      notes: 'Project management',
      contract_end_date: new Date('2026-08-15')
    },
    {
      organization_id: orgB.id,
      name: 'PwC Advisory',
      domain: 'pwc.com',
      category: 'Consulting',
      risk_level: 'Low',
      status: 'Active',
      notes: 'Compliance audit'
    },
    {
      organization_id: orgB.id,
      name: 'ShadowStack',
      domain: 'shadowstack.io',
      category: 'SaaS',
      risk_level: 'High',
      status: 'Under Review',
      notes: 'New SIEM vendor — security assessment in progress'
    },
    {
      organization_id: orgB.id,
      name: 'NetOps Ltd',
      domain: 'netops.co.uk',
      category: 'Other',
      risk_level: 'Critical',
      status: 'Inactive',
      notes: 'Terminated contract due to security incident'
    }
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- seed data literals match DB enum strings
const suppliers = await db.insertInto('suppliers').values(suppliersData as any).returningAll().execute();

  console.log(
    `  ✓ Suppliers: ${suppliers.length} created (${suppliersData.filter((s) => s.organization_id === orgA.id).length} Acme, ${suppliersData.filter((s) => s.organization_id === orgB.id).length} Globex)`
  );

  // ── Summary ────────────────────────────────────────────────
  console.log('\n── Seed complete ────────────────────────────────');
  console.log('  Organisations: 2');
  console.log('  Users:         4');
  console.log(`  Suppliers:     ${suppliers.length}`);
  console.log('\n  Login credentials (all passwords: password123):');
  console.log('    alice@acme.com    — Owner  (Acme Corp)');
  console.log('    bob@acme.com      — Admin  (Acme Corp)');
  console.log('    charlie@globex.com — Analyst (Globex Industries)');
  console.log('    diana@globex.com  — Auditor (Globex Industries)');

  await db.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
