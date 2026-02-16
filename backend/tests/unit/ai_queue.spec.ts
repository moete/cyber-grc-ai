import { test } from '@japa/runner';
import { AiAnalysisStatus } from '@shared';
import db from '#services/db';
import { processAiJob, updateSupplierAiStatus } from '#services/ai_queue';
import { _setAiServiceForTesting } from '#services/ai_service';
import type { IAiService, IAiAnalysisRequest, IAiAnalysisResponse } from 'ai-service';

// ── helpers ─────────────────────────────────────────────────────────

/** Find the first Acme Corp supplier in the DB (created by seed). */
async function findTestSupplier() {
  return db.selectFrom('suppliers').selectAll().limit(1).executeTakeFirstOrThrow();
}

/** Stub AI service that returns a fixed response. */
function makeMockAiService(response: IAiAnalysisResponse): IAiService {
  return {
    async analyzeSupplier(_input: IAiAnalysisRequest) {
      return response;
    }
  };
}

/** Stub AI service that always throws. */
function makeFailingAiService(message: string): IAiService {
  return {
    async analyzeSupplier(_input: IAiAnalysisRequest) {
      throw new Error(message);
    }
  };
}

// ── updateSupplierAiStatus ──────────────────────────────────────────

test.group('updateSupplierAiStatus', (group) => {
  group.each.teardown(async () => {
    _setAiServiceForTesting(null);
  });

  test('updates AI status with org-scoping', async ({ assert }) => {
    const supplier = await findTestSupplier();

    await updateSupplierAiStatus(supplier.id, supplier.organization_id, {
      ai_status: AiAnalysisStatus.PROCESSING,
      ai_error: null
    });

    const updated = await db.selectFrom('suppliers').where('id', '=', supplier.id).select(['ai_status']).executeTakeFirstOrThrow();

    assert.equal(updated.ai_status, AiAnalysisStatus.PROCESSING);

    // Restore original status
    await updateSupplierAiStatus(supplier.id, supplier.organization_id, {
      ai_status: supplier.ai_status ?? AiAnalysisStatus.PENDING
    });
  });

  test('does not update supplier in a different organization', async ({ assert }) => {
    const supplier = await findTestSupplier();
    const originalStatus = supplier.ai_status;

    // Use a fake org ID — should match 0 rows
    await updateSupplierAiStatus(supplier.id, 'non-existent-org-id', {
      ai_status: AiAnalysisStatus.ERROR,
      ai_error: 'should not appear'
    });

    const unchanged = await db
      .selectFrom('suppliers')
      .where('id', '=', supplier.id)
      .select(['ai_status', 'ai_error'])
      .executeTakeFirstOrThrow();

    assert.equal(unchanged.ai_status, originalStatus);
  });
});

// ── processAiJob ────────────────────────────────────────────────────

test.group('processAiJob', (group) => {
  group.each.teardown(async () => {
    _setAiServiceForTesting(null);
  });

  test('sets status to COMPLETE on success', async ({ assert }) => {
    const supplier = await findTestSupplier();

    const mockResponse: IAiAnalysisResponse = {
      score: 72,
      analysis: {
        summary: 'Test summary',
        riskFactors: [],
        recommendations: ['Test rec'],
        confidence: 0.85,
        analyzedAt: new Date().toISOString(),
        modelVersion: 'test-mock'
      }
    };
    _setAiServiceForTesting(makeMockAiService(mockResponse));

    await processAiJob({
      supplierId: supplier.id,
      organizationId: supplier.organization_id
    });

    const updated = await db
      .selectFrom('suppliers')
      .where('id', '=', supplier.id)
      .select(['ai_status', 'ai_risk_score', 'ai_error'])
      .executeTakeFirstOrThrow();

    assert.equal(updated.ai_status, AiAnalysisStatus.COMPLETE);
    assert.equal(updated.ai_risk_score, 72);
    assert.isNull(updated.ai_error);

    // Restore
    await updateSupplierAiStatus(supplier.id, supplier.organization_id, {
      ai_status: supplier.ai_status ?? AiAnalysisStatus.PENDING,
      ai_risk_score: supplier.ai_risk_score,
      ai_analysis: supplier.ai_analysis,
      ai_error: supplier.ai_error
    });
  });

  test('sets status to ERROR and clears stale data on failure', async ({ assert }) => {
    const supplier = await findTestSupplier();

    _setAiServiceForTesting(makeFailingAiService('API rate limit exceeded'));

    // processAiJob re-throws, so we expect it to reject
    await assert.rejects(
      () =>
        processAiJob({
          supplierId: supplier.id,
          organizationId: supplier.organization_id
        }),
      'API rate limit exceeded'
    );

    const updated = await db
      .selectFrom('suppliers')
      .where('id', '=', supplier.id)
      .select(['ai_status', 'ai_error', 'ai_analysis', 'ai_risk_score'])
      .executeTakeFirstOrThrow();

    assert.equal(updated.ai_status, AiAnalysisStatus.ERROR);
    assert.include(updated.ai_error!, 'API rate limit');
    assert.isNull(updated.ai_analysis);
    assert.isNull(updated.ai_risk_score);

    // Restore
    await updateSupplierAiStatus(supplier.id, supplier.organization_id, {
      ai_status: supplier.ai_status ?? AiAnalysisStatus.PENDING,
      ai_risk_score: supplier.ai_risk_score,
      ai_analysis: supplier.ai_analysis,
      ai_error: supplier.ai_error
    });
  });

  test('truncates long error messages to 500 chars', async ({ assert }) => {
    const supplier = await findTestSupplier();

    const longMessage = 'x'.repeat(1000);
    _setAiServiceForTesting(makeFailingAiService(longMessage));

    await assert.rejects(() =>
      processAiJob({
        supplierId: supplier.id,
        organizationId: supplier.organization_id
      })
    );

    const updated = await db.selectFrom('suppliers').where('id', '=', supplier.id).select(['ai_error']).executeTakeFirstOrThrow();

    assert.isAtMost(updated.ai_error!.length, 500);

    // Restore
    await updateSupplierAiStatus(supplier.id, supplier.organization_id, {
      ai_status: supplier.ai_status ?? AiAnalysisStatus.PENDING,
      ai_error: supplier.ai_error
    });
  });

  test('silently returns when supplier not found in org', async ({ assert }) => {
    const mockResponse: IAiAnalysisResponse = {
      score: 50,
      analysis: {
        summary: 'Should not be saved',
        riskFactors: [],
        recommendations: [],
        confidence: 0.5,
        analyzedAt: new Date().toISOString(),
        modelVersion: 'test'
      }
    };
    _setAiServiceForTesting(makeMockAiService(mockResponse));

    // Non-existent supplier — should not throw
    await processAiJob({
      supplierId: '00000000-0000-0000-0000-000000000000',
      organizationId: '00000000-0000-0000-0000-000000000000'
    });

    // If we get here without error, the test passes
    assert.isTrue(true);
  });
});
