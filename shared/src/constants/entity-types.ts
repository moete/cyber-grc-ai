/**
 * Entity type constants used in the audit trail's `entityType` field.
 * Centralised here so both backend (when writing audit logs) and
 * frontend (when displaying the audit timeline) use the same values.
 */
export const ENTITY_TYPES = {
  SUPPLIER: 'supplier',
  USER: 'user',
  ORGANISATION: 'organisation',
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];
