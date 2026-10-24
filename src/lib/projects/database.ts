import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { projectSnapshotSchema, type ProjectRecord, type ProjectSnapshot, type ProjectSummary } from "./schema";

interface ProjectRow {
  id: string;
  title: string;
  stage: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

const globalDatabase = globalThis as typeof globalThis & { hireflowDatabase?: DatabaseSync };

export function getDatabase() {
  if (globalDatabase.hireflowDatabase) return globalDatabase.hireflowDatabase;
  const dataDirectory = join(process.cwd(), "data");
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(join(dataDirectory, "hireflow.db"));
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
  `);
  globalDatabase.hireflowDatabase = database;
  return database;
}

function rowToRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    stage: projectSnapshotSchema.shape.stage.parse(row.stage),
    snapshot: projectSnapshotSchema.parse(JSON.parse(row.data_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(snapshot: ProjectSnapshot) {
  const database = getDatabase();
  const now = new Date().toISOString();
  database.prepare("INSERT INTO projects (id, title, stage, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(snapshot.id, snapshot.title, snapshot.stage, JSON.stringify(snapshot), now, now);
  return getProject(snapshot.id)!;
}

export function updateProject(snapshot: ProjectSnapshot) {
  const database = getDatabase();
  const now = new Date().toISOString();
  const result = database.prepare("UPDATE projects SET title = ?, stage = ?, data_json = ?, updated_at = ? WHERE id = ?")
    .run(snapshot.title, snapshot.stage, JSON.stringify(snapshot), now, snapshot.id);
  return result.changes > 0 ? getProject(snapshot.id) : null;
}

export function getProject(id: string) {
  const row = getDatabase().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function deleteProject(id: string) {
  return getDatabase().prepare("DELETE FROM projects WHERE id = ?").run(id).changes > 0;
}

export function listProjects(page: number, pageSize: number) {
  const database = getDatabase();
  const total = (database.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }).count;
  const rows = database.prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?")
    .all(pageSize, (page - 1) * pageSize) as unknown as ProjectRow[];
  const data: ProjectSummary[] = rows.map((row) => {
    const record = rowToRecord(row);
    const complete = record.snapshot.candidates.filter((item) => item.status === "complete" && item.match);
    const top = complete.sort((left, right) => (right.match?.totalScore ?? 0) - (left.match?.totalScore ?? 0))[0];
    return {
      id: record.id,
      title: record.title,
      stage: record.stage,
      candidateCount: complete.length,
      topScore: top?.match?.totalScore ?? null,
      recommendation: record.snapshot.report?.recommendation ?? top?.match?.recommendation ?? null,
      candidateInitials: complete.map((candidate) => {
        const name = candidate.profile?.candidateName ?? candidate.sourceName;
        return name.trim().slice(0, 2).toUpperCase();
      }).slice(0, 3),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });
  return { data, pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) } };
}

export function getAllProjects() {
  const rows = getDatabase().prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as unknown as ProjectRow[];
  return rows.map(rowToRecord);
}
