import type {
  IAiAnalysis,
  IAiAnalysisRequest,
  IAiAnalysisResponse,
  IAiRiskFactor,
} from '@shared'
import { RiskLevel } from '@shared'
import Anthropic from '@anthropic-ai/sdk'

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
      throw new Error('AI service temporarily unavailable')
    }

    const baseScore = this.deriveBaseScore(input)
    const analysis: IAiAnalysis = {
      summary: this.buildSummary(input, baseScore),
      riskFactors: this.buildRiskFactors(input),
      recommendations: this.buildRecommendations(input, baseScore),
      confidence: 0.82,
      analyzedAt: new Date().toISOString(),
      modelVersion: 'demo',
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
    return `Supplier risk analysis for ${input.supplierName} (${input.supplierDomain}) in category "${input.supplierCategory}". Overall risk score: ${score}/100.`
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

const RISK_LEVEL_VALUES = new Set<string>(['Low', 'Medium', 'High', 'Critical'])

function parseRiskLevel(value: unknown): RiskLevel {
  if (typeof value !== 'string') return RiskLevel.LOW
  const normalized = value.trim()
  if (RISK_LEVEL_VALUES.has(normalized)) return normalized as RiskLevel
  const lower = normalized.toLowerCase()
  if (lower === 'low') return RiskLevel.LOW
  if (lower === 'medium') return RiskLevel.MEDIUM
  if (lower === 'high') return RiskLevel.HIGH
  if (lower === 'critical') return RiskLevel.CRITICAL
  return RiskLevel.LOW
}

/** Truncate and sanitize user-provided text before sending to the model (limit injection + token size). */
function sanitize(text: string | null, maxLen: number): string {
  if (text == null) return ''
  const trimmed = String(text).slice(0, maxLen).replace(/\s+/g, ' ').trim()
  return trimmed
}

const SYSTEM_PROMPT = `You are a cyber GRC (Governance, Risk, Compliance) analyst. Your task is to evaluate third-party supplier risk based on the information provided.

Respond with a single JSON object only, no markdown or explanation. The JSON must have exactly this shape:
{
  "score": <number 0-100, overall risk score, higher = riskier>,
  "analysis": {
    "summary": "<string, 1-3 sentences>",
    "riskFactors": [
      { "factor": "<string>", "riskLevel": "Low"|"Medium"|"High"|"Critical", "description": "<string>" }
    ],
    "recommendations": ["<string>", ...],
    "confidence": <number 0-1>,
    "analyzedAt": "<ISO 8601 date string>",
    "modelVersion": "<string, e.g. claude-3-5-sonnet>"
  }
}

riskLevel must be exactly one of: Low, Medium, High, Critical.`

type TextContentBlock = { type: 'text'; text: string }

/**
 * Real Claude API implementation. Uses Anthropic Messages API with a fixed system prompt
 * and sanitized user content. When ANTHROPIC_API_KEY is set, the backend uses this
 * instead of MockClaudeService.
 */
export class ClaudeService implements IAiService {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    options?: { model?: string }
  ) {
    this.client = new Anthropic({ apiKey })
    this.model = options?.model ?? 'claude-sonnet-4-5-20250929'
  }

  private readonly model: string

  async analyzeSupplier(input: IAiAnalysisRequest): Promise<IAiAnalysisResponse> {
    const name = sanitize(input.supplierName, 500)
    const domain = sanitize(input.supplierDomain, 300)
    const category = sanitize(input.supplierCategory, 200)
    const notes = sanitize(input.supplierNotes, 2000)

    const userContent = `Analyze supplier risk for:
- Name: ${name}
- Domain: ${domain}
- Category: ${category}
${notes ? `- Notes: ${notes}` : ''}

Output the JSON object only.`

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const block = message.content.find((b): b is TextContentBlock => b.type === 'text')
    if (!block) {
      throw new Error('Claude returned no text content')
    }

    const raw = block.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}') + 1
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart ? raw.slice(jsonStart, jsonEnd) : raw

    let parsed: {
      score?: number
      analysis?: {
        summary?: string
        riskFactors?: Array<{ factor?: string; riskLevel?: string; description?: string }>
        recommendations?: string[]
        confidence?: number
        analyzedAt?: string
        modelVersion?: string
      }
    }
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed
    } catch {
      throw new Error('Claude response was not valid JSON')
    }

    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : 50

    const a = parsed.analysis ?? {}
    const riskFactors: IAiRiskFactor[] = (Array.isArray(a.riskFactors) ? a.riskFactors : []).map(
      (f) => ({
        factor: typeof f.factor === 'string' ? f.factor : 'Unknown',
        riskLevel: parseRiskLevel(f.riskLevel),
        description: typeof f.description === 'string' ? f.description : '',
      })
    )
    const recommendations = Array.isArray(a.recommendations)
      ? a.recommendations.filter((r): r is string => typeof r === 'string')
      : []

    const analysis: IAiAnalysis = {
      summary: typeof a.summary === 'string' ? a.summary : 'No summary produced.',
      riskFactors,
      recommendations,
      confidence: typeof a.confidence === 'number' ? Math.max(0, Math.min(1, a.confidence)) : 0.8,
      analyzedAt: typeof a.analyzedAt === 'string' ? a.analyzedAt : new Date().toISOString(),
      modelVersion: typeof a.modelVersion === 'string' ? a.modelVersion : this.model,
    }

    return { score, analysis }
  }
}

