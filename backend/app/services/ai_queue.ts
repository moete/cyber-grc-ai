import * as net from 'node:net';
import { Queue, Worker, JobsOptions } from 'bullmq';
import env from '#start/env';
import db from '#services/db';
import { analyzeSupplierRisk } from '#services/ai_service';
import { AiAnalysisStatus } from '@shared';

const REDIS_HOST = env.get('REDIS_HOST', 'localhost');
const REDIS_PORT = Number(env.get('REDIS_PORT', 6379));

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT
};

const QUEUE_NAME = 'ai-analysis';
const REDIS_CHECK_TIMEOUT_MS = 2000;

type AiJobData = {
  supplierId: string;
  organizationId: string;
};

let queue: Queue<AiJobData> | null = null;
let worker: Worker<AiJobData> | null = null;
let redisCheckDone: boolean | null = null;

/** Check if Redis is reachable (avoids starting Worker when Redis is down). */
function checkRedis(): Promise<boolean> {
  if (redisCheckDone !== null) return Promise.resolve(redisCheckDone);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      redisCheckDone = false;
      resolve(false);
    }, REDIS_CHECK_TIMEOUT_MS);
    socket
      .once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        redisCheckDone = true;
        resolve(true);
      })
      .once('error', () => {
        clearTimeout(timer);
        redisCheckDone = false;
        resolve(false);
      })
      .connect(REDIS_PORT, REDIS_HOST);
  });
}

async function getOrCreateQueue(): Promise<Queue<AiJobData> | null> {
  if (queue) return queue;
  const ok = await checkRedis();
  if (!ok) return null;

  queue = new Queue<AiJobData>(QUEUE_NAME, { connection });

  worker = new Worker<AiJobData>(
    QUEUE_NAME,
    async (job) => {
      const { supplierId } = job.data;
      await db
        .updateTable('suppliers')
        .set({
          ai_status: AiAnalysisStatus.PROCESSING,
          ai_last_requested_at: new Date(),
          ai_error: null
        })
        .where('id', '=', supplierId)
        .execute();

      const supplier = await db
        .selectFrom('suppliers')
        .where('id', '=', supplierId)
        .select(['id', 'name', 'domain', 'category', 'notes', 'organization_id'])
        .executeTakeFirst();

      if (!supplier) return;

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
            ai_error: typeof error?.message === 'string' ? error.message.slice(0, 500) : 'AI analysis failed',
            ai_analysis: null,
            ai_risk_score: null
          })
          .where('id', '=', supplierId)
          .execute();
        throw error;
      }
    },
    { connection }
  );

  return queue;
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: false
};

export async function enqueueAiJob(data: AiJobData): Promise<void> {
  const q = await getOrCreateQueue();
  if (q) {
    await q.add('analyze-supplier', data, defaultJobOptions);
    return;
  }
  // Redis unavailable: set supplier to error so UI shows a message instead of stuck PENDING
  await db
    .updateTable('suppliers')
    .set({
      ai_status: AiAnalysisStatus.ERROR,
      ai_error: 'Redis unavailable. Start Redis (or use Docker) to enable AI analysis.'
    })
    .where('id', '=', data.supplierId)
    .execute();
}

/** Close queue and worker so the process can exit. No-op if never connected. */
export async function closeAiQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}
