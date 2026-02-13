import { AiAnalysisStatus, Category, RiskLevel, Status } from '@shared';

export type SupplierRow = {
  id: string;
  organization_id: string;
  name: string;
  domain: string;
  category: Category;
  risk_level: RiskLevel;
  status: Status;
  contract_end_date: Date | null;
  notes: string | null;
  ai_risk_score: number | null;
  ai_analysis: Record<string, unknown> | null;
  ai_status: AiAnalysisStatus | null;
  ai_last_requested_at: Date | null;
  ai_last_completed_at: Date | null;
  ai_error: string | null;
  created_at: Date;
  updated_at: Date;
};
