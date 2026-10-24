import { describe, expect, it } from "vitest";
import { createProjectSchema } from "./schema";

const emptyProject = {
  title: "AI 产品经理",
  stage: "job" as const,
  job: null,
  candidates: [],
  selectedCandidateId: null,
  resume: null,
  resumeText: "",
  match: null,
  questions: [],
  answers: {},
  report: null,
  events: [],
};

describe("project snapshot", () => {
  it("accepts a new empty recruiting project", () => {
    expect(createProjectSchema.parse(emptyProject).title).toBe("AI 产品经理");
  });

  it("rejects snapshots with more than ten candidates", () => {
    const candidates = Array.from({ length: 11 }, (_, index) => ({
      id: `candidate-${index}`,
      sourceName: `resume-${index}.pdf`,
      status: "queued" as const,
    }));
    expect(createProjectSchema.safeParse({ ...emptyProject, candidates }).success).toBe(false);
  });

  it("accepts per-candidate interviews while keeping legacy snapshots valid", () => {
    const withInterview = createProjectSchema.safeParse({
      ...emptyProject,
      candidates: [{
        id: "candidate-1",
        sourceName: "resume.pdf",
        status: "complete",
        interview: {
          status: "in_progress",
          questions: [],
          answers: {},
          report: null,
        },
      }],
    });

    expect(createProjectSchema.safeParse(emptyProject).success).toBe(true);
    expect(withInterview.success).toBe(true);
  });

  it("persists an auditable HR decision without making AI the final decision", () => {
    const decidedAt = new Date().toISOString();
    const withDecision = createProjectSchema.safeParse({
      ...emptyProject,
      candidates: [{
        id: "candidate-1",
        sourceName: "resume.pdf",
        status: "complete",
        hrDecision: {
          status: "hold",
          reason: "薪酬期望待确认",
          note: "等待候选人确认期望范围",
          decidedAt,
          actor: "HR",
          history: [{
            status: "hold",
            reason: "薪酬期望待确认",
            note: "等待候选人确认期望范围",
            decidedAt,
            actor: "HR",
          }],
        },
      }],
    });

    expect(withDecision.success).toBe(true);
  });
});
