import type { TrainingBrief } from "./schemas";

export interface TrainingDraft {
  id: string;
  brief: TrainingBrief;
  updatedAt: string;
}

const STORAGE_KEY = "hireflow-training-drafts";
const MAX_DRAFTS = 8;

export function isTrainingBriefEmpty(brief: TrainingBrief) {
  return Object.values(brief).every((value) => value.trim().length === 0);
}

export function readTrainingDrafts(): TrainingDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is TrainingDraft => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<TrainingDraft>;
        return typeof candidate.id === "string"
          && typeof candidate.updatedAt === "string"
          && !!candidate.brief
          && typeof candidate.brief.traineeName === "string"
          && typeof candidate.brief.topic === "string"
          && typeof candidate.brief.audience === "string"
          && typeof candidate.brief.objective === "string"
          && typeof candidate.brief.context === "string";
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, MAX_DRAFTS);
  } catch {
    return [];
  }
}

export function saveTrainingDraft(draft: TrainingDraft) {
  if (typeof window === "undefined") return [];
  const next = [draft, ...readTrainingDrafts().filter((item) => item.id !== draft.id)]
    .slice(0, MAX_DRAFTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return readTrainingDrafts();
  }
  return next;
}

export function deleteTrainingDraft(id: string) {
  if (typeof window === "undefined") return [];
  const next = readTrainingDrafts().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return readTrainingDrafts();
  }
  return next;
}

