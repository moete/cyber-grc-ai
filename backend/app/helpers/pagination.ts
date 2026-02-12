/**
 * Shared pagination utilities used by any paginated controller endpoint.
 *
 * Usage:
 *   const pg = parsePagination(request.qs())
 *   const total = await countQuery(query)
 *   return paginated(response, rows.map(mapper), pg, total)
 */

import { HttpStatusCode, type IPaginatedResponse } from '@shared'
import type { Response } from '@adonisjs/core/http'

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Parse & clamp page/limit from the raw query string.
 */
export function parsePagination(qs: Record<string, any>, defaultLimit = 10): PaginationParams {
  const page = Math.max(1, Number(qs.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(qs.limit) || defaultLimit))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

/**
 * Execute a COUNT(*) on a Kysely SelectQueryBuilder and return the number.
 */
export async function countQuery(query: any): Promise<number> {
  const result = await query
    .select((eb: any) => eb.fn.countAll().as('count'))
    .executeTakeFirst()
  return Number((result as any)?.count ?? 0)
}

/**
 * Build and send a paginated JSON response.
 */
export function paginated<T>(
  response: Response,
  data: T[],
  pg: PaginationParams,
  total: number,
) {
  return response.status(HttpStatusCode.OK).send(<IPaginatedResponse<T>>{
    data,
    meta: {
      total,
      page: pg.page,
      limit: pg.limit,
      totalPages: Math.ceil(total / pg.limit),
    },
  })
}
