import vine from '@vinejs/vine'
import { Category, RiskLevel, Status } from 'shared'

const categoryValues = Object.values(Category) as [string, ...string[]]
const riskLevelValues = Object.values(RiskLevel) as [string, ...string[]]
const statusValues = Object.values(Status) as [string, ...string[]]

export const createSupplierValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    domain: vine.string().trim().minLength(1).maxLength(255),
    category: vine.enum(categoryValues),
    riskLevel: vine.enum(riskLevelValues),
    status: vine.enum(statusValues),
    contractEndDate: vine.string().optional(),
    notes: vine.string().maxLength(2000).optional(),
  }),
)

export const updateSupplierValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255).optional(),
    domain: vine.string().trim().minLength(1).maxLength(255).optional(),
    category: vine.enum(categoryValues).optional(),
    riskLevel: vine.enum(riskLevelValues).optional(),
    status: vine.enum(statusValues).optional(),
    contractEndDate: vine.string().optional(),
    notes: vine.string().maxLength(2000).optional(),
  }),
)

export const listSuppliersValidator = vine.compile(
  vine.object({
    page: vine.number().optional(),
    limit: vine.number().optional(),
    name: vine.string().trim().optional(),
    category: vine.enum(categoryValues).optional(),
    riskLevel: vine.enum(riskLevelValues).optional(),
    status: vine.enum(statusValues).optional(),
    sortBy: vine.enum(['name', 'category', 'riskLevel', 'status', 'createdAt', 'updatedAt']).optional(),
    sortOrder: vine.enum(['asc', 'desc']).optional(),
  }),
)
