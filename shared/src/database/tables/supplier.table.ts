import type { ColumnType, Generated } from 'kysely';
import type { AiAnalysisStatus, Category, RiskLevel, Status } from '@shared';

export interface SupplierTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  domain: string;
  category: Category;
  risk_level: RiskLevel;
  status: Status;
  contract_end_date: Date | null;
  notes: string | null;
  ai_risk_score: number | null;
  /** jsonb — stored as string in insert, parsed as object on select */
  ai_analysis: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  ai_status: AiAnalysisStatus | null;
  ai_last_requested_at: Date | null;
  ai_last_completed_at: Date | null;
  ai_error: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

