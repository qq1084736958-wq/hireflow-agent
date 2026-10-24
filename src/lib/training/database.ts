import { getDatabase } from "@/lib/projects/database";
import {
  trainingRecordSnapshotSchema,
  type TrainingRecord,
  type TrainingRecordSnapshot,
  type TrainingRecordSummary,
} from "./schemas";

interface TrainingRecordRow {
  id: string;
  title: string;
  trainee_name: string;
  score: number;
  recommendation: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

function database() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      trainee_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      recommendation TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS training_records_updated_at_idx
      ON training_records(updated_at DESC);
  `);
  return db;
}

function rowToRecord(row: TrainingRecordRow): TrainingRecord {
  return {
    id: row.id,
    snapshot: trainingRecordSnapshotSchema.parse(JSON.parse(row.data_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTrainingRecord(snapshot: TrainingRecordSnapshot) {
  const now = new Date().toISOString();
  database().prepare(`
    INSERT INTO training_records
      (id, title, trainee_name, score, recommendation, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.id,
    snapshot.plan.title,
    snapshot.brief.traineeName,
    snapshot.report.overallScore,
    snapshot.report.recommendation,
    JSON.stringify(snapshot),
    now,
    now,
  );
  return getTrainingRecord(snapshot.id)!;
}

export function getTrainingRecord(id: string) {
  const row = database().prepare("SELECT * FROM training_records WHERE id = ?").get(id) as TrainingRecordRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function deleteTrainingRecord(id: string) {
  return database().prepare("DELETE FROM training_records WHERE id = ?").run(id).changes > 0;
}

export function listTrainingRecords(page: number, pageSize: number) {
  const db = database();
  const total = (db.prepare("SELECT COUNT(*) AS count FROM training_records").get() as { count: number }).count;
  const rows = db.prepare("SELECT * FROM training_records ORDER BY updated_at DESC LIMIT ? OFFSET ?")
    .all(pageSize, (page - 1) * pageSize) as unknown as TrainingRecordRow[];
  const data: TrainingRecordSummary[] = rows.map((row) => {
    const record = rowToRecord(row);
    return {
      id: record.id,
      title: row.title,
      traineeName: row.trainee_name,
      overallScore: row.score,
      recommendation: row.recommendation,
      learnerTurns: record.snapshot.messages.filter((message) => message.role === "learner").length,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
  return { data, pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) } };
}

export function getAllTrainingRecords() {
  const rows = database().prepare("SELECT * FROM training_records ORDER BY updated_at DESC").all() as unknown as TrainingRecordRow[];
  return rows.map(rowToRecord);
}
