import type { ColumnType, Generated } from 'kysely';


export interface SupplierTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  domain: string;
  category: string;
  risk_level: string;
  status: string;
  contract_end_date: Date | null;
  notes: string | null;
  ai_risk_score: number | null;
  /** jsonb — stored as string in insert, parsed as object on select */
  ai_analysis: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
