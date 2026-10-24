import { getDatabase } from "@/lib/projects/database";
import { jobAnalysisSchema, matchResultSchema, resumeProfileSchema, type JobAnalysis } from "./schemas";

export type ResumeBatchStatus = "queued" | "running" | "completed" | "completed_with_errors" | "failed";
export type ResumeBatchItemStatus = "queued" | "processing" | "complete" | "failed";
export type ResumeBatchItemPhase = "queued" | "parsing" | "matching" | "complete" | "error";

interface BatchRow {
  id: string;
  project_id: string;
  job_json: string;
  status: ResumeBatchStatus;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  batch_id: string;
  source_name: string;
  alias: string;
  resume_text: string;
  status: ResumeBatchItemStatus;
  phase: ResumeBatchItemPhase;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  lease_expires_at: string | null;
  result_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeBatchItemResult {
  profile: ReturnType<typeof resumeProfileSchema.parse>;
  resumeText: string;
  match: ReturnType<typeof matchResultSchema.parse>;
}

export interface ResumeBatchItemView {
  id: string;
  sourceName: string;
  status: ResumeBatchItemStatus;
  phase: ResumeBatchItemPhase;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  error: string | null;
  result: ResumeBatchItemResult | null;
}

export interface ResumeBatchView {
  id: string;
  projectId: string;
  status: ResumeBatchStatus;
  createdAt: string;
  updatedAt: string;
  summary: {
    total: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
  };
  items: ResumeBatchItemView[];
}

export interface ClaimedResumeBatchItem {
  id: string;
  batchId: string;
  alias: string;
  resumeText: string;
  attempts: number;
  maxAttempts: number;
  job: JobAnalysis;
}

function database() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      job_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resume_batches_project_idx
      ON resume_batches(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS resume_batch_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      alias TEXT NOT NULL,
      resume_text TEXT NOT NULL,
      status TEXT NOT NULL,
      phase TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      max_attempts INTEGER NOT NULL,
      next_attempt_at TEXT,
      lease_expires_at TEXT,
      result_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES resume_batches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS resume_batch_items_claim_idx
      ON resume_batch_items(batch_id, status, next_attempt_at);
  `);
  return db;
}

function parseItem(row: ItemRow): ResumeBatchItemView {
  const rawResult = row.result_json ? JSON.parse(row.result_json) as ResumeBatchItemResult : null;
  const result = rawResult ? {
    profile: resumeProfileSchema.parse(rawResult.profile),
    resumeText: rawResult.resumeText,
    match: matchResultSchema.parse(rawResult.match),
  } : null;
  return {
    id: row.id,
    sourceName: row.source_name,
    status: row.status,
    phase: row.phase,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRetryAt: row.next_attempt_at,
    error: row.error,
    result,
  };
}

export function createResumeBatch(input: {
  projectId: string;
  job: JobAnalysis;
  items: Array<{ sourceName: string; alias: string; resumeText: string; error?: string }>;
}) {
  const db = database();
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO resume_batches (id, project_id, job_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(batchId, input.projectId, JSON.stringify(input.job), "queued", now, now);
    const insert = db.prepare(`
      INSERT INTO resume_batch_items
        (id, batch_id, source_name, alias, resume_text, status, phase, attempts, max_attempts, next_attempt_at, lease_expires_at, result_json, error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 3, NULL, NULL, NULL, ?, ?, ?)
    `);
    for (const item of input.items) {
      insert.run(
        crypto.randomUUID(),
        batchId,
        item.sourceName,
        item.alias,
        item.resumeText,
        item.error ? "failed" : "queued",
        item.error ? "error" : "queued",
        item.error ?? null,
        now,
        now,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  refreshResumeBatchStatus(batchId);
  return getResumeBatch(batchId)!;
}

export function getResumeBatch(batchId: string): ResumeBatchView | null {
  const db = database();
  const batch = db.prepare("SELECT * FROM resume_batches WHERE id = ?").get(batchId) as unknown as BatchRow | undefined;
  if (!batch) return null;
  const rows = db.prepare("SELECT * FROM resume_batch_items WHERE batch_id = ? ORDER BY created_at, id")
    .all(batchId) as unknown as ItemRow[];
  const items = rows.map(parseItem);
  const summary = {
    total: items.length,
    queued: items.filter((item) => item.status === "queued").length,
    processing: items.filter((item) => item.status === "processing").length,
    complete: items.filter((item) => item.status === "complete").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
  return {
    id: batch.id,
    projectId: batch.project_id,
    status: batch.status,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    summary,
    items,
  };
}

export function getLatestResumeBatchForProject(projectId: string) {
  const row = database().prepare("SELECT id FROM resume_batches WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(projectId) as { id: string } | undefined;
  return row ? getResumeBatch(row.id) : null;
}

export function claimNextResumeBatchItem(batchId: string): ClaimedResumeBatchItem | null {
  const db = database();
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpiresAt = new Date(now.getTime() + 150_000).toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      UPDATE resume_batch_items
      SET status = 'queued', phase = 'queued', lease_expires_at = NULL, error = '上次处理超时，已自动恢复', updated_at = ?
      WHERE batch_id = ? AND status = 'processing' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?
    `).run(nowIso, batchId, nowIso);
    const row = db.prepare(`
      SELECT * FROM resume_batch_items
      WHERE batch_id = ? AND status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
      ORDER BY created_at, id LIMIT 1
    `).get(batchId, nowIso) as unknown as ItemRow | undefined;
    if (!row) {
      db.exec("COMMIT");
      return null;
    }
    db.prepare(`
      UPDATE resume_batch_items
      SET status = 'processing', phase = 'parsing', attempts = attempts + 1, lease_expires_at = ?, next_attempt_at = NULL, error = NULL, updated_at = ?
      WHERE id = ?
    `).run(leaseExpiresAt, nowIso, row.id);
    const batch = db.prepare("SELECT job_json FROM resume_batches WHERE id = ?").get(batchId) as { job_json: string };
    db.prepare("UPDATE resume_batches SET status = 'running', updated_at = ? WHERE id = ?").run(nowIso, batchId);
    db.exec("COMMIT");
    return {
      id: row.id,
      batchId,
      alias: row.alias,
      resumeText: row.resume_text,
      attempts: row.attempts + 1,
      maxAttempts: row.max_attempts,
      job: jobAnalysisSchema.parse(JSON.parse(batch.job_json)),
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function setResumeBatchItemPhase(itemId: string, phase: ResumeBatchItemPhase) {
  const now = new Date().toISOString();
  database().prepare("UPDATE resume_batch_items SET phase = ?, updated_at = ? WHERE id = ?")
    .run(phase, now, itemId);
}

export function completeResumeBatchItem(itemId: string, result: ResumeBatchItemResult) {
  const now = new Date().toISOString();
  const row = database().prepare("SELECT batch_id FROM resume_batch_items WHERE id = ?").get(itemId) as { batch_id: string };
  database().prepare(`
    UPDATE resume_batch_items
    SET status = 'complete', phase = 'complete', result_json = ?, error = NULL, lease_expires_at = NULL, next_attempt_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(result), now, itemId);
  refreshResumeBatchStatus(row.batch_id);
}

export function failResumeBatchItem(itemId: string, message: string) {
  const db = database();
  const row = db.prepare("SELECT batch_id, attempts, max_attempts FROM resume_batch_items WHERE id = ?")
    .get(itemId) as { batch_id: string; attempts: number; max_attempts: number };
  const retrying = row.attempts < row.max_attempts;
  const delayMs = 2_000 * (2 ** Math.max(0, row.attempts - 1));
  const now = new Date();
  db.prepare(`
    UPDATE resume_batch_items
    SET status = ?, phase = ?, error = ?, lease_expires_at = NULL, next_attempt_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    retrying ? "queued" : "failed",
    retrying ? "queued" : "error",
    retrying ? `${message}；系统将在第 ${row.attempts + 1} 次尝试时重试` : message,
    retrying ? new Date(now.getTime() + delayMs).toISOString() : null,
    now.toISOString(),
    itemId,
  );
  refreshResumeBatchStatus(row.batch_id);
}

export function retryResumeBatchItem(batchId: string, itemId: string) {
  const now = new Date().toISOString();
  const result = database().prepare(`
    UPDATE resume_batch_items
    SET status = 'queued', phase = 'queued', attempts = 0, next_attempt_at = NULL, lease_expires_at = NULL, error = NULL, updated_at = ?
    WHERE id = ? AND batch_id = ? AND status = 'failed'
  `).run(now, itemId, batchId);
  if (result.changes > 0) {
    database().prepare("UPDATE resume_batches SET status = 'running', updated_at = ? WHERE id = ?").run(now, batchId);
  }
  return result.changes > 0;
}

export function refreshResumeBatchStatus(batchId: string) {
  const db = database();
  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS complete,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
    FROM resume_batch_items WHERE batch_id = ?
  `).get(batchId) as { total: number; queued: number; processing: number; complete: number; failed: number };
  let status: ResumeBatchStatus = "running";
  if (counts.total === 0 || counts.failed === counts.total) status = "failed";
  else if (counts.complete + counts.failed === counts.total) status = counts.failed > 0 ? "completed_with_errors" : "completed";
  else if (counts.processing === 0 && counts.complete === 0) status = "queued";
  db.prepare("UPDATE resume_batches SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, new Date().toISOString(), batchId);
  return status;
}

