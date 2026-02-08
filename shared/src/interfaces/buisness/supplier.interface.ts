import { Category, RiskLevel, Status } from '../../enums';


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
    createdAt: Date;
    updatedAt: Date;
}

export type ISupplierCreate = Omit<
    ISupplier,
    'id' | 'createdAt' | 'updatedAt' | 'aiRiskScore' | 'aiAnalysis'
> & {
    aiRiskScore?: number | null;
    aiAnalysis?: Record<string, unknown> | null;
};

export type ISupplierUpdate = Partial<
    Omit<ISupplier, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
>;
