import Anthropic from '@anthropic-ai/sdk'
import { RiskLevel } from '@shared'
import type { IAiAnalysis, IAiAnalysisRequest, IAiAnalysisResponse, IAiRiskFactor, IAiService } from './interface.js'

const RISK_LEVEL_VALUES = new Set<string>(['Low', 'Medium', 'High', 'Critical'])

export function parseRiskLevel(value: unknown): RiskLevel {
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
export function sanitize(text: string | null | undefined, maxLen: number): string {
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
 * and sanitized user content.
 */
export class ClaudeService implements IAiService {
  private readonly client: Anthropic
  private readonly model: string

  constructor(
    apiKey: string,
    options?: { model?: string },
  ) {
    this.client = new Anthropic({ apiKey })
    this.model = options?.model ?? 'claude-sonnet-4-5-20250929'
  }

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
      throw new Error(
        `Claude returned no text content (${message.content.length} block(s), types: ${message.content.map((b) => b.type).join(', ') || 'none'})`,
      )
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
      throw new Error(`Claude response was not valid JSON: ${raw.slice(0, 200)}`)
    }

    const score =
      typeof parsed.score === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : 50

    const a = parsed.analysis ?? {}
    const riskFactors: IAiRiskFactor[] = (Array.isArray(a.riskFactors) ? a.riskFactors : []).map(
      (f) => ({
        factor: typeof f.factor === 'string' ? f.factor : 'Unknown',
        riskLevel: parseRiskLevel(f.riskLevel),
        description: typeof f.description === 'string' ? f.description : '',
      }),
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
