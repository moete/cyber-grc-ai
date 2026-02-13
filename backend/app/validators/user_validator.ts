import vine from '@vinejs/vine';

const roleEnum = vine.enum(['Owner', 'Admin', 'Analyst', 'Auditor']);

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().normalizeEmail(),
    firstName: vine.string().trim().minLength(1).maxLength(255),
    lastName: vine.string().trim().minLength(1).maxLength(255),
    password: vine.string().minLength(8, 'Password must be at least 8 characters'),
    role: roleEnum
  })
);

export const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().normalizeEmail().optional(),
    firstName: vine.string().trim().minLength(1).maxLength(255).optional(),
    lastName: vine.string().trim().minLength(1).maxLength(255).optional(),
    role: roleEnum.optional(),
    isActive: vine.boolean().optional(),
    password: vine.string().minLength(8).optional()
  })
);
