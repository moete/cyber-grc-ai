import { Queue, Worker, JobsOptions } from 'bullmq';
import env from '#start/env';
import db from '#services/db';
import { analyzeSupplierRisk } from '#services/ai_service';
import { AiAnalysisStatus } from '@shared';

const connection = {
  host: env.get('REDIS_HOST', 'localhost'),
  port: Number(env.get('REDIS_PORT', 6379))
};

const QUEUE_NAME = 'ai-analysis';

type AiJobData = {
  supplierId: string;
  organizationId: string;
};

export const aiQueue = new Queue<AiJobData>(QUEUE_NAME, { connection });

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5_000
  },
  removeOnComplete: true,
  removeOnFail: false
};

export async function enqueueAiJob(data: AiJobData) {
  await aiQueue.add('analyze-supplier', data, defaultJobOptions);
}

// Worker: processes AI analysis jobs
export const aiWorker = new Worker<AiJobData>(
  QUEUE_NAME,
  async (job) => {
    const { supplierId } = job.data;

    // Mark as processing
    await db
      .updateTable('suppliers')
      .set({
        ai_status: AiAnalysisStatus.PROCESSING,
        ai_last_requested_at: new Date(),
        ai_error: null
      })
      .where('id', '=', supplierId)
      .execute();

    // Load current supplier snapshot
    const supplier = await db
      .selectFrom('suppliers')
      .where('id', '=', supplierId)
      .select(['id', 'name', 'domain', 'category', 'notes', 'organization_id'])
      .executeTakeFirst();

    if (!supplier) {
      // Nothing to do (supplier deleted or org changed)
      return;
    }

    try {
      const result = await analyzeSupplierRisk({
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierDomain: supplier.domain,
        supplierCategory: supplier.category,
        supplierNotes: supplier.notes,
        organizationId: supplier.organization_id
      });

      await db
        .updateTable('suppliers')
        .set({
          ai_status: AiAnalysisStatus.COMPLETE,
          ai_risk_score: result.score,
          ai_analysis: result.analysis as any,
          ai_last_completed_at: new Date(),
          ai_error: null
        })
        .where('id', '=', supplierId)
        .execute();
    } catch (error: any) {
      await db
        .updateTable('suppliers')
        .set({
          ai_status: AiAnalysisStatus.ERROR,
          ai_error: typeof error?.message === 'string' ? error.message.slice(0, 500) : 'AI analysis failed'
        })
        .where('id', '=', supplierId)
        .execute();

      throw error;
    }
  },
  { connection }
);

/** Close queue and worker so the process can exit  */
export async function closeAiQueue(): Promise<void> {
  await aiWorker.close();
  await aiQueue.close();
}
