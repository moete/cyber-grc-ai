import type {IAiAnalysisRequest,IAiAnalysisResponse,IAiService} from 'ai-service'
import { MockClaudeService } from 'ai-service'

/**
 * Singleton AI service instance used by the backend.
 *
 * For the take‑home, this is a MockClaudeService implementation that:
 * - Simulates latency and occasional failures
 * - Produces deterministic scores and narratives from supplier data
 *
 * The rest of the code depends only on the IAiService interface, so we can
 * later swap this for a real ClaudeService without touching controllers.
 */
const aiService: IAiService = new MockClaudeService()

export function getAiService(): IAiService {
  return aiService
}

export async function analyzeSupplierRisk(
  payload: IAiAnalysisRequest
): Promise<IAiAnalysisResponse> {
  return aiService.analyzeSupplier(payload)
}

