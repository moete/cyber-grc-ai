import { AiAnalysisStatus, RiskLevel } from '../../enums';

export interface IAiAnalysis {
  summary: string;
  riskFactors: IAiRiskFactor[];
  recommendations: string[];
  confidence: number;
  analyzedAt: string;
  modelVersion: string;
}

export interface IAiRiskFactor {
  factor: string;
  riskLevel: RiskLevel;
  description: string;
}

/** Tracks the state of an AI analysis job for a supplier */
export interface IAiAnalysisJob {
  id: string;
  supplierId: string;
  organizationId: string;
  status: AiAnalysisStatus;
  result: IAiAnalysis | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/** Request payload sent to the AI service for risk evaluation */
export interface IAiAnalysisRequest {
  supplierId: string;
  supplierName: string;
  supplierDomain: string;
  supplierCategory: string;
  supplierNotes: string | null;
  organizationId: string;
}

/** Response from the AI service */
export interface IAiAnalysisResponse {
  score: number;
  analysis: IAiAnalysis;
}
