import * as net from 'node:net';
import { Queue, Worker, type JobsOptions } from 'bullmq';
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

export type AiJobData = {
  supplierId: string;
  organizationId: string;
};

let queue: Queue<AiJobData> | null = null;
let worker: Worker<AiJobData> | null = null;

// ── Helpers ─────────────────────────────────────────────────────────

/** Check if Redis is reachable. Checked on every enqueue — no caching. */
function checkRedis(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, REDIS_CHECK_TIMEOUT_MS);
    socket
      .once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      })
      .once('error', () => {
        clearTimeout(timer);
        resolve(false);
      })
      .connect(REDIS_PORT, REDIS_HOST);
  });
}

/**
 * DRY helper to update AI-related columns on a supplier row.
 * All worker status transitions go through here, including org-scoping.
 */
export async function updateSupplierAiStatus(supplierId: string, organizationId: string, fields: Record<string, unknown>): Promise<void> {
  await db.updateTable('suppliers').set(fields).where('id', '=', supplierId).where('organization_id', '=', organizationId).execute();
}

// ── Worker processor (extracted for testability) ────────────────────

/**
 * Process a single AI analysis job. Exported so it can be unit-tested
 * without spinning up a real BullMQ worker.
 */
export async function processAiJob(data: AiJobData): Promise<void> {
  const { supplierId, organizationId } = data;

  await updateSupplierAiStatus(supplierId, organizationId, {
    ai_status: AiAnalysisStatus.PROCESSING,
    ai_last_requested_at: new Date(),
    ai_error: null
  });

  const supplier = await db
    .selectFrom('suppliers')
    .where('id', '=', supplierId)
    .where('organization_id', '=', organizationId)
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
    await updateSupplierAiStatus(supplierId, organizationId, {
      ai_status: AiAnalysisStatus.COMPLETE,
      ai_risk_score: result.score,
      ai_analysis: result.analysis as unknown as Record<string, unknown>,
      ai_last_completed_at: new Date(),
      ai_error: null
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'AI analysis failed';
    await updateSupplierAiStatus(supplierId, organizationId, {
      ai_status: AiAnalysisStatus.ERROR,
      ai_error: message,
      ai_analysis: null,
      ai_risk_score: null
    });
    throw error;
  }
}

// ── Queue management ────────────────────────────────────────────────

async function getOrCreateQueue(): Promise<Queue<AiJobData> | null> {
  if (queue) return queue;

  const ok = await checkRedis();
  if (!ok) return null;

  queue = new Queue<AiJobData>(QUEUE_NAME, { connection });

  worker = new Worker<AiJobData>(QUEUE_NAME, async (job) => processAiJob(job.data), { connection });

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
  // Redis unavailable: mark error so UI shows a message instead of stuck PENDING
  await updateSupplierAiStatus(data.supplierId, data.organizationId, {
    ai_status: AiAnalysisStatus.ERROR,
    ai_error: 'Redis unavailable. Start Redis (or use Docker) to enable AI analysis.'
  });
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
