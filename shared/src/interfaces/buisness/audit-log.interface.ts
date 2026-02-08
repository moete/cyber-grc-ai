import { AuditAction } from '../../enums';
import type { EntityType } from '../../constants/entity-types';

/**
 * Audit log business interface.
 * APPEND-ONLY: no updatedAt — entries are immutable once created.
 */
export interface IAuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: Date;
}
