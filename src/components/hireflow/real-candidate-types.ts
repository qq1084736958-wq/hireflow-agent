import type {
  InterviewQuestion,
  InterviewReport,
  MatchResult,
  ResumeProfile,
} from "@/lib/agent/schemas";
import type { HrDecision } from "@/lib/projects/schema";

export type CandidateRunStatus = "queued" | "parsing" | "matching" | "complete" | "error";
export type CandidateInterviewStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface CandidateInterview {
  status: CandidateInterviewStatus;
  questions: InterviewQuestion[];
  answers: Record<string, string>;
  answerSources?: Record<string, "manual" | "simulated">;
  report: InterviewReport | null;
}

export interface CandidateRun {
  id: string;
  sourceName: string;
  file: File | null;
  pastedText: string;
  status: CandidateRunStatus;
  profile?: ResumeProfile;
  resumeText?: string;
  match?: MatchResult;
  interview?: CandidateInterview;
  hrDecision?: HrDecision;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  nextRetryAt?: string | null;
}

export function sortCompletedCandidates(candidates: CandidateRun[]) {
  return candidates
    .filter((item): item is CandidateRun & { profile: ResumeProfile; resumeText: string; match: MatchResult } => (
      item.status === "complete" && Boolean(item.profile && item.resumeText && item.match)
    ))
    .sort((left, right) => right.match.totalScore - left.match.totalScore);
}

export function getCandidateInterviewStatus(candidate: CandidateRun): CandidateInterviewStatus {
  return candidate.interview?.status ?? "not_started";
}

export function findNextInterviewCandidate(candidates: CandidateRun[], currentId: string | null) {
  const ranked = sortCompletedCandidates(candidates);
  if (ranked.length === 0) return null;

  const startIndex = Math.max(ranked.findIndex((item) => item.id === currentId), -1);
  for (let offset = 1; offset <= ranked.length; offset += 1) {
    const candidate = ranked[(startIndex + offset) % ranked.length];
    const status = getCandidateInterviewStatus(candidate);
    if (status !== "completed" && status !== "skipped") return candidate;
  }
  return null;
}

export function getInterviewProgress(candidates: CandidateRun[]) {
  const ranked = sortCompletedCandidates(candidates);
  const completed = ranked.filter((item) => getCandidateInterviewStatus(item) === "completed").length;
  const inProgress = ranked.filter((item) => getCandidateInterviewStatus(item) === "in_progress").length;
  return { completed, inProgress, total: ranked.length };
}
