import vine from '@vinejs/vine'

/**
 * Validators grouped per resource (not per operation).
 * One file, multiple exports — easier to navigate than 3 tiny files
 * with identical imports.
 */

export const createSupplierValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    domain: vine.string().trim().minLength(1).maxLength(255),
    category: vine.enum(['SaaS', 'Infrastructure', 'Consulting', 'Other']),
    riskLevel: vine.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
    status: vine.enum(['Active', 'Under Review', 'Inactive']).optional(),
    contractEndDate: vine.string().optional(),
    notes: vine.string().maxLength(5000).optional(),
  })
)

export const updateSupplierValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255).optional(),
    domain: vine.string().trim().minLength(1).maxLength(255).optional(),
    category: vine.enum(['SaaS', 'Infrastructure', 'Consulting', 'Other']).optional(),
    riskLevel: vine.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
    status: vine.enum(['Active', 'Under Review', 'Inactive']).optional(),
    contractEndDate: vine.string().optional(),
    notes: vine.string().maxLength(5000).optional(),
  })
)
