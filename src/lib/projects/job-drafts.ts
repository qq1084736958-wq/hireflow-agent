import { z } from "zod";
import { getDatabase } from "./database";

export const jobDraftContentSchema = z.object({
  title: z.string().max(200),
  jd: z.string().max(30_000),
});

export const jobDraftSchema = jobDraftContentSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;
export type JobDraftContent = z.infer<typeof jobDraftContentSchema>;

interface DraftRow {
  id: string;
  title: string;
  jd: string;
  created_at: string;
  updated_at: string;
}

function database() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_drafts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      jd TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS job_drafts_updated_at_idx ON job_drafts(updated_at DESC);
  `);
  return db;
}

function rowToDraft(row: DraftRow): JobDraft {
  return {
    id: row.id,
    title: row.title,
    jd: row.jd,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createJobDraft(content: JobDraftContent) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database().prepare("INSERT INTO job_drafts (id, title, jd, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, content.title, content.jd, now, now);
  return getJobDraft(id)!;
}

export function updateJobDraft(id: string, content: JobDraftContent) {
  const result = database().prepare("UPDATE job_drafts SET title = ?, jd = ?, updated_at = ? WHERE id = ?")
    .run(content.title, content.jd, new Date().toISOString(), id);
  return result.changes > 0 ? getJobDraft(id) : null;
}

export function getJobDraft(id: string) {
  const row = database().prepare("SELECT * FROM job_drafts WHERE id = ?").get(id) as unknown as DraftRow | undefined;
  return row ? rowToDraft(row) : null;
}

export function listJobDrafts() {
  const rows = database().prepare("SELECT * FROM job_drafts ORDER BY updated_at DESC").all() as unknown as DraftRow[];
  return rows.map(rowToDraft);
}

export function deleteJobDraft(id: string) {
  return database().prepare("DELETE FROM job_drafts WHERE id = ?").run(id).changes > 0;
}

