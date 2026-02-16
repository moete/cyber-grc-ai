import type { IAiAnalysisRequest, IAiAnalysisResponse, IAiService } from 'ai-service';
import { ClaudeService } from 'ai-service';
import env from '#start/env';

let aiService: IAiService | null = null;

function getOrCreateAiService(): IAiService {
  if (aiService) return aiService;
  const apiKey = env.get('ANTHROPIC_API_KEY');
  if (!apiKey || apiKey.length === 0) {
    throw new Error(
      'ANTHROPIC_API_KEY is required for AI analysis. Add it to your backend .env file (see .env.example).'
    );
  }
  aiService = new ClaudeService(apiKey);
  return aiService;
}

export function getAiService(): IAiService {
  return getOrCreateAiService();
}

export async function analyzeSupplierRisk(payload: IAiAnalysisRequest): Promise<IAiAnalysisResponse> {
  return getOrCreateAiService().analyzeSupplier(payload);
}
