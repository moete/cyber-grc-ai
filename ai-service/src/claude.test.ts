import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseRiskLevel, sanitize, ClaudeService } from './claude.js'
import { RiskLevel } from '@shared'

// ── parseRiskLevel ──────────────────────────────────────────────────

describe('parseRiskLevel', () => {
  it('returns Low for exact "Low"', () => {
    expect(parseRiskLevel('Low')).toBe(RiskLevel.LOW)
  })

  it('returns Medium for exact "Medium"', () => {
    expect(parseRiskLevel('Medium')).toBe(RiskLevel.MEDIUM)
  })

  it('returns High for exact "High"', () => {
    expect(parseRiskLevel('High')).toBe(RiskLevel.HIGH)
  })

  it('returns Critical for exact "Critical"', () => {
    expect(parseRiskLevel('Critical')).toBe(RiskLevel.CRITICAL)
  })

  it('handles lowercase "low"', () => {
    expect(parseRiskLevel('low')).toBe(RiskLevel.LOW)
  })

  it('handles lowercase "medium"', () => {
    expect(parseRiskLevel('medium')).toBe(RiskLevel.MEDIUM)
  })

  it('handles lowercase "high"', () => {
    expect(parseRiskLevel('high')).toBe(RiskLevel.HIGH)
  })

  it('handles lowercase "critical"', () => {
    expect(parseRiskLevel('critical')).toBe(RiskLevel.CRITICAL)
  })

  it('handles leading/trailing whitespace', () => {
    expect(parseRiskLevel('  High  ')).toBe(RiskLevel.HIGH)
  })

  it('returns Low for unknown string', () => {
    expect(parseRiskLevel('extreme')).toBe(RiskLevel.LOW)
  })

  it('returns Low for empty string', () => {
    expect(parseRiskLevel('')).toBe(RiskLevel.LOW)
  })

  it('returns Low for non-string types', () => {
    expect(parseRiskLevel(42)).toBe(RiskLevel.LOW)
    expect(parseRiskLevel(null)).toBe(RiskLevel.LOW)
    expect(parseRiskLevel(undefined)).toBe(RiskLevel.LOW)
    expect(parseRiskLevel({})).toBe(RiskLevel.LOW)
  })
})

// ── sanitize ────────────────────────────────────────────────────────

describe('sanitize', () => {
  it('returns empty string for null', () => {
    expect(sanitize(null, 100)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitize(undefined, 100)).toBe('')
  })

  it('returns the text unchanged when under maxLen', () => {
    expect(sanitize('hello world', 100)).toBe('hello world')
  })

  it('truncates text exceeding maxLen', () => {
    const long = 'a'.repeat(200)
    expect(sanitize(long, 50).length).toBeLessThanOrEqual(50)
  })

  it('collapses multiple whitespace to single space', () => {
    expect(sanitize('hello   world\n\tbar', 500)).toBe('hello world bar')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitize('  hello  ', 100)).toBe('hello')
  })

  it('handles empty string', () => {
    expect(sanitize('', 100)).toBe('')
  })

  it('handles maxLen of 0', () => {
    expect(sanitize('hello', 0)).toBe('')
  })
})

// ── ClaudeService.analyzeSupplier (mocked SDK) ─────────────────────

// Mock the Anthropic SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn()
  MockAnthropic.prototype.messages = {
    create: vi.fn(),
  }
  return { default: MockAnthropic }
})

function makeService() {
  return new ClaudeService('test-api-key', { model: 'test-model' })
}

const baseInput = {
  supplierId: 'sup-1',
  supplierName: 'Acme Corp',
  supplierDomain: 'acme.com',
  supplierCategory: 'SaaS',
  supplierNotes: 'Some notes about the supplier',
  organizationId: 'org-1',
}

function makeClaudeResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  }
}

describe('ClaudeService.analyzeSupplier', () => {
  let service: ClaudeService
  let mockCreate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    service = makeService()
    // Access the mocked create function
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    mockCreate = new Anthropic().messages.create as ReturnType<typeof vi.fn>
    // Re-assign to service's client
    ;(service as any).client.messages.create = mockCreate
  })

  it('parses a well-formed Claude JSON response', async () => {
    const claudeJson = JSON.stringify({
      score: 75,
      analysis: {
        summary: 'High risk supplier.',
        riskFactors: [
          { factor: 'Data exposure', riskLevel: 'High', description: 'Handles PII' },
        ],
        recommendations: ['Conduct audit'],
        confidence: 0.9,
        analyzedAt: '2025-01-01T00:00:00Z',
        modelVersion: 'claude-3-5-sonnet',
      },
    })
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(claudeJson))

    const result = await service.analyzeSupplier(baseInput)

    expect(result.score).toBe(75)
    expect(result.analysis.summary).toBe('High risk supplier.')
    expect(result.analysis.riskFactors).toHaveLength(1)
    expect(result.analysis.riskFactors[0].riskLevel).toBe(RiskLevel.HIGH)
    expect(result.analysis.recommendations).toEqual(['Conduct audit'])
    expect(result.analysis.confidence).toBe(0.9)
  })

  it('extracts JSON when Claude wraps it in markdown', async () => {
    const wrapped = '```json\n' + JSON.stringify({ score: 60, analysis: { summary: 'ok' } }) + '\n```'
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(wrapped))

    const result = await service.analyzeSupplier(baseInput)

    expect(result.score).toBe(60)
    expect(result.analysis.summary).toBe('ok')
  })

  it('extracts JSON when Claude adds preamble text', async () => {
    const preamble = 'Here is my analysis:\n' + JSON.stringify({ score: 42, analysis: { summary: 'moderate' } })
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(preamble))

    const result = await service.analyzeSupplier(baseInput)

    expect(result.score).toBe(42)
  })

  it('clamps score to 0-100 range', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ score: 150, analysis: {} })),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.score).toBe(100)

    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ score: -20, analysis: {} })),
    )
    const result2 = await service.analyzeSupplier(baseInput)
    expect(result2.score).toBe(0)
  })

  it('defaults to score 50 when score is missing', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ analysis: { summary: 'no score' } })),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.score).toBe(50)
  })

  it('provides fallback values when analysis fields are missing', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ score: 30 })),
    )
    const result = await service.analyzeSupplier(baseInput)

    expect(result.analysis.summary).toBe('No summary produced.')
    expect(result.analysis.riskFactors).toEqual([])
    expect(result.analysis.recommendations).toEqual([])
    expect(result.analysis.confidence).toBe(0.8)
    expect(result.analysis.modelVersion).toBe('test-model')
  })

  it('clamps confidence to 0-1 range', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ score: 50, analysis: { confidence: 5 } })),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.analysis.confidence).toBe(1)
  })

  it('handles malformed riskFactors (non-array)', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(JSON.stringify({ score: 50, analysis: { riskFactors: 'not-an-array' } })),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.analysis.riskFactors).toEqual([])
  })

  it('handles riskFactor with missing fields', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(
        JSON.stringify({
          score: 50,
          analysis: { riskFactors: [{ riskLevel: 'High' }] },
        }),
      ),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.analysis.riskFactors[0].factor).toBe('Unknown')
    expect(result.analysis.riskFactors[0].description).toBe('')
  })

  it('filters non-string recommendations', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(
        JSON.stringify({
          score: 50,
          analysis: { recommendations: ['valid', 42, null, 'also valid'] },
        }),
      ),
    )
    const result = await service.analyzeSupplier(baseInput)
    expect(result.analysis.recommendations).toEqual(['valid', 'also valid'])
  })

  it('throws descriptive error when response is not JSON', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse('I cannot process that request.'),
    )
    await expect(service.analyzeSupplier(baseInput)).rejects.toThrow(
      /Claude response was not valid JSON/,
    )
  })

  it('error message includes truncated raw text', async () => {
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse('Not JSON at all'),
    )
    await expect(service.analyzeSupplier(baseInput)).rejects.toThrow(
      /Not JSON at all/,
    )
  })

  it('throws when Claude returns no text block', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'image', source: {} }],
    })
    await expect(service.analyzeSupplier(baseInput)).rejects.toThrow(
      /Claude returned no text content/,
    )
  })

  it('throws when Claude returns empty content array', async () => {
    mockCreate.mockResolvedValueOnce({ content: [] })
    await expect(service.analyzeSupplier(baseInput)).rejects.toThrow(
      /Claude returned no text content/,
    )
  })
})
