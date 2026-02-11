import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { sql } from 'kysely'
import db from '#services/db'
import { HttpStatusCode } from '@shared'

/**
 * Organization-scope middleware — sets the PostgreSQL session variable
 * `app.current_org_id` for Row-Level Security defense-in-depth.
 *
 * The primary isolation mechanism is application-level scoping
 * (every query includes WHERE organization_id = ?). RLS is a safety net
 * that catches any missed scope filter.
 *
 * Note: RLS is only enforced for non-superuser connections.
 * In development (postgres superuser), this set_config still runs
 * but the policies are not enforced. See migration 005 and ARCHITECTURE.md.
 */
export default class OrgScopeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.auth?.organizationId) {
      ctx.response.status(HttpStatusCode.UNAUTHORIZED).send({
        success: false,
        message: 'Organization context missing — authenticate first',
        statusCode: HttpStatusCode.UNAUTHORIZED,
      })
      return
    }

    // Set PG session variable for RLS (best-effort, app-level scoping is primary)
    try {
      await sql`SELECT set_config('app.current_org_id', ${ctx.auth.organizationId}, false)`.execute(db)
    } catch {
      // If set_config fails, application-level scoping still protects us.
      // Log the failure for observability in production.
    }

    return next()
  }
}
