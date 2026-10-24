import { describe, expect, it } from "vitest";
import { calculateRecruitmentAnalytics } from "./analytics";
import type { ProjectRecord } from "./schema";

function project(id: string, stage: ProjectRecord["stage"], score: number | null, hasReport = false): ProjectRecord {
  const candidate = score === null ? [] : [{
    id: `candidate-${id}`, sourceName: "陈晨.pdf", status: "complete" as const,
    profile: { candidateName: "陈晨", headline: "产品经理", experienceYears: 5, education: "本科", location: "上海", skills: ["AI"], achievements: ["上线产品"], experiences: [{ company: "示例公司", title: "产品经理", period: "2022-2026", highlights: ["负责产品"] }], missingInformation: [] },
    match: { totalScore: score, summary: "匹配结果", recommendation: "推荐面试" as const, strengths: ["经验"], gaps: ["待确认"], risks: [], matches: [{ requirementId: "r1", label: "产品经验", status: "已满足" as const, score, evidenceQuote: "负责产品", evidenceSource: "简历", reasoning: "符合要求", interviewFocus: "追问结果" }] },
  }];
  return {
    id, title: `职位 ${id}`, stage, createdAt: "2026-07-20T10:00:00.000Z", updatedAt: "2026-07-22T10:00:00.000Z",
    snapshot: { id, title: `职位 ${id}`, stage, job: null, candidates: candidate, selectedCandidateId: null, resume: null, resumeText: "", match: null, questions: [], answers: {}, report: hasReport ? { overallScore: 80, recommendation: "建议进入下一轮", executiveSummary: "表现良好", strengths: ["清晰"], risks: [], followUps: [], evaluations: [{ questionId: "q1", score: 80, starCompleteness: 80, evidenceConsistency: 80, professionalDepth: 80, strengths: ["清晰"], concerns: [], feedback: "继续" }] } : null, events: [] },
  };
}

describe("recruitment analytics", () => {
  it("calculates dashboard values only from stored projects", () => {
    const records = [
      project("11111111-1111-4111-8111-111111111111", "resume", 80),
      project("22222222-2222-4222-8222-222222222222", "report", 60, true),
      project("33333333-3333-4333-8333-333333333333", "job", null),
    ];
    const analytics = calculateRecruitmentAnalytics(records);
    expect(analytics.metrics).toEqual({ activeProjects: 2, evaluatedCandidates: 2, averageMatchScore: 70, completedReports: 1 });
    expect(analytics.activeProjects).toHaveLength(2);
    expect(analytics.activeProjects[0].candidateInitials).toEqual(["陈晨"]);
  });
});
