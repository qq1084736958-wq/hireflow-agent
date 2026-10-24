import type { ProjectRecord, ProjectSummary, RecruitmentAnalytics } from "./schema";

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function summarize(record: ProjectRecord): ProjectSummary {
  const complete = record.snapshot.candidates
    .filter((candidate) => candidate.status === "complete" && candidate.match)
    .sort((left, right) => (right.match?.totalScore ?? 0) - (left.match?.totalScore ?? 0));
  const top = complete[0];
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
}

export function calculateRecruitmentAnalytics(records: ProjectRecord[]): RecruitmentAnalytics {
  const matchedCandidates = records.flatMap((record) => record.snapshot.candidates.filter((candidate) => candidate.status === "complete" && candidate.match));
  return {
    metrics: {
      activeProjects: records.filter((record) => record.stage !== "report").length,
      evaluatedCandidates: matchedCandidates.length,
      averageMatchScore: average(matchedCandidates.map((candidate) => candidate.match!.totalScore)),
      completedReports: records.filter((record) => Boolean(record.snapshot.report)).length,
    },
    activeProjects: records.filter((record) => record.stage !== "report").map(summarize).slice(0, 5),
  };
}
