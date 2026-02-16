import type {
  IAiAnalysis,
  IAiAnalysisRequest,
  IAiAnalysisResponse,
  IAiRiskFactor,
} from '@shared'

export type { IAiAnalysis, IAiAnalysisRequest, IAiAnalysisResponse, IAiRiskFactor }

export interface IAiService {
  analyzeSupplier(input: IAiAnalysisRequest): Promise<IAiAnalysisResponse>
}
