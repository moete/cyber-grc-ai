import type {IAiAnalysis,IAiAnalysisRequest,IAiAnalysisResponse} from '@shared'
import { RiskLevel } from '@shared'

export type { IAiAnalysis, IAiAnalysisRequest, IAiAnalysisResponse }

export interface IAiService {
  analyzeSupplier(input: IAiAnalysisRequest): Promise<IAiAnalysisResponse>
}

/**
 * Mock implementation of the AI analysis service.
 *
 * - No external calls (safe for tests and recruiters).
 * - Deterministic based on supplier category + notes length.
 * - Simulates latency and occasional failures to exercise the pipeline.
 *
 * The backend should depend on IAiService, so we can later swap this
 * for a real Claude implementation without touching controllers.
 */
export class MockClaudeService implements IAiService {
  constructor(private readonly minDelayMs = 400, private readonly maxDelayMs = 1500) {}

  async analyzeSupplier(input: IAiAnalysisRequest): Promise<IAiAnalysisResponse> {
    // Simulated network / model latency
    const delay =
      this.minDelayMs +
      Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs))
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Optional: simulate occasional upstream failure
    if (Math.random() < 0.05) {
      throw new Error('Mock AI service unavailable')
    }

    const baseScore = this.deriveBaseScore(input)
    const analysis: IAiAnalysis = {
      summary: this.buildSummary(input, baseScore),
      riskFactors: this.buildRiskFactors(input),
      recommendations: this.buildRecommendations(input, baseScore),
      confidence: 0.82,
      analyzedAt: new Date().toISOString(),
      modelVersion: 'mock-claude-v1',
    }

    return {
      score: baseScore,
      analysis,
    }
  }

  private deriveBaseScore(input: IAiAnalysisRequest): number {
    let score = 50

    const category = input.supplierCategory.toLowerCase()
    if (category.includes('infrastructure')) score += 10
    if (category.includes('consulting')) score -= 5
    if (category.includes('legacy')) score += 20

    const notesLength = (input.supplierNotes ?? '').length
    if (notesLength > 300) score += 5
    if (notesLength < 20) score += 5 // not enough information

    return Math.max(0, Math.min(100, score))
  }

  private buildSummary(
    input: IAiAnalysisRequest,
    score: number
  ): string {
    return `Mock AI analysis for ${input.supplierName} (${input.supplierDomain}) in category "${input.supplierCategory}". Overall risk score: ${score}/100.`
  }

  private buildRiskFactors(
    input: IAiAnalysisRequest
  ): IAiAnalysis['riskFactors'] {
    const factors: IAiAnalysis['riskFactors'] = []

    const notes = (input.supplierNotes ?? '').toLowerCase()

    if (notes.includes('legacy') || notes.includes('end-of-life')) {
      factors.push({
        factor: 'Legacy technology',
        riskLevel: RiskLevel.HIGH,
        description:
          'Supplier references legacy or end-of-life technology, which can increase security and support risks.',
      })
    }

    if (notes.includes('third-party')) {
      factors.push({
        factor: 'Third-party dependencies',
        riskLevel: RiskLevel.MEDIUM,
        description:
          'Reliance on third-party components may increase the surface for supply-chain vulnerabilities.',
      })
    }

    if (factors.length === 0) {
      factors.push({
        factor: 'No obvious high-risk indicators in notes',
        riskLevel: RiskLevel.LOW,
        description:
          'Based on the limited information available, no major risk factors were detected.',
      })
    }

    return factors
  }

  private buildRecommendations(
    input: IAiAnalysisRequest,
    score: number
  ): IAiAnalysis['recommendations'] {
    const recs: string[] = []

    if (score >= 70) {
      recs.push(
        'Perform a detailed security assessment and request recent penetration test reports.'
      )
    } else if (score >= 40) {
      recs.push(
        'Monitor the supplier annually and review their security questionnaires.'
      )
    } else {
      recs.push(
        'Maintain a lightweight monitoring schedule; reassess only if their scope expands.'
      )
    }

    if ((input.supplierNotes ?? '').length < 50) {
      recs.push(
        'Collect more detailed information about data flows, hosting regions, and sub-processors.'
      )
    }

    return recs
  }
}

/**
 * Placeholder for a real Claude API client.
 *
 * This class documents how we would plug the Anthropic API:
 * - Use env vars for API key and optional base URL.
 * - Sanitize user-provided fields before injecting into the prompt.
 * - Separate a fixed system prompt from user content to limit prompt injection.
 *
 * For the take-home, backend code should depend on IAiService and use
 * MockClaudeService by default. Swapping to ClaudeService can be done
 * later without touching controllers.
 */
export class ClaudeService implements IAiService {
  constructor(
    private readonly _apiKey: string,
    private readonly _baseUrl = 'https://api.anthropic.com/v1/messages'
  ) {}

  async analyzeSupplier(_input: IAiAnalysisRequest): Promise<IAiAnalysisResponse> {
    void this._apiKey;
    void this._baseUrl;
    void _input;
    // In the test environment we do not call the real API.
    // This implementation is a stub to show how it would look.
    throw new Error(
      'ClaudeService is not enabled in this environment. Use MockClaudeService instead.'
    )
  }
}

