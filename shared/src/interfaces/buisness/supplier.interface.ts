import { AiAnalysisStatus, Category, RiskLevel, Status } from '@shared';

export interface ISupplier {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  category: Category;
  riskLevel: RiskLevel;
  status: Status;
  contractEndDate: Date | null;
  notes: string | null;
  aiRiskScore: number | null;
  /** Analyse score calculated by the LLM (jsonb) */
  aiAnalysis: Record<string, unknown> | null;
  aiStatus: AiAnalysisStatus | null;
  aiLastRequestedAt: Date | null;
  aiLastCompletedAt: Date | null;
  aiError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ISupplierCreate = Omit<
  ISupplier,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'aiRiskScore'
  | 'aiAnalysis'
  | 'aiStatus'
  | 'aiLastRequestedAt'
  | 'aiLastCompletedAt'
  | 'aiError'
> & {
  aiRiskScore?: number | null;
  aiAnalysis?: Record<string, unknown> | null;
};

export type ISupplierUpdate = Partial<
  Omit<
    ISupplier,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'aiStatus'
    | 'aiLastRequestedAt'
    | 'aiLastCompletedAt'
    | 'aiError'
  >
>;

