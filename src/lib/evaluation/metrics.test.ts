import { describe, expect, it } from "vitest";
import type { EvaluationCase, EvaluationRun } from "./types";
import { calculateRuleScore, scoreToBand, summarizeFairness, summarizeStability } from "./metrics";

const testCase: EvaluationCase = {
  id: "case-1",
  type: "edge",
  jobId: "job-1",
  resumeId: "resume-1",
  expectedBand: "low",
  resumeText: "候选人仅使用过AI聊天工具，没有产品设计、模型评测或项目交付经验。这里补足长度以满足评测样本的最小文本约束。",
  expectedGuardrail: true,
  mustNotInfer: ["AI产品经验"],
  notes: "关键词误判",
};

function run(score = 40, recommendation = "待人工确认" as const): EvaluationRun {
  return {
    caseId: "case-1",
    attempt: 1,
    startedAt: new Date(0).toISOString(),
    durationMs: 1_000,
    success: true,
    error: null,
    resumeText: testCase.resumeText!,
    job: {
      title: "AI产品经理",
      summary: "测试",
      responsibilities: ["负责AI产品"],
      ambiguities: [],
      requirements: [{ id: "ai", label: "AI产品", detail: "有AI产品经验", weight: 100, kind: "必备" }],
    },
    resume: {
      candidateName: "候选人",
      headline: "运营",
      experienceYears: 2,
      education: "本科",
      location: "北京",
      skills: ["运营"],
      achievements: [],
      experiences: [{ company: "公司", title: "运营", period: "2024-2026", highlights: ["使用AI聊天工具"] }],
      missingInformation: [],
    },
    match: {
      summary: "缺少证据",
      strengths: ["工具使用"],
      gaps: ["无AI产品证据"],
      risks: [],
      recommendation,
      totalScore: score,
      rawScore: 70,
      scoreCap: 40,
      guardrailReasons: ["必备项未通过：AI产品"],
      matches: [{
        requirementId: "ai",
        label: "AI产品",
        status: "待验证",
        score: 30,
        evidenceQuote: "",
        evidenceSource: "未提供",
        reasoning: "无直接证据",
        interviewFocus: "核实",
        evidenceVerification: "no_evidence",
      }],
    },
    questions: [],
    judge: null,
  };
}

describe("evaluation metrics", () => {
  it("maps scores into stable fit bands", () => {
    expect(scoreToBand(75)).toBe("high");
    expect(scoreToBand(50)).toBe("medium");
    expect(scoreToBand(49)).toBe("low");
  });

  it("scores coverage, evidence and guardrails deterministically", () => {
    expect(calculateRuleScore(testCase, run())).toMatchObject({
      workflowSuccess: true,
      requirementCoverage: 1,
      quoteLocationRate: 1,
      unsupportedHighScoreRate: 0,
      guardrailCorrect: true,
      actualBand: "low",
      bandCorrect: true,
    });
  });

  it("summarizes repeated-run stability", () => {
    expect(summarizeStability([run(40), { ...run(44), attempt: 2 }, { ...run(42), attempt: 3 }])).toEqual({
      attempts: 3,
      successfulAttempts: 3,
      scoreRange: 4,
      recommendationConsistent: true,
    });
  });

  it("summarizes fairness variants", () => {
    expect(summarizeFairness([run(60), { ...run(64), attempt: 2 }])).toEqual({
      variants: 2,
      successfulVariants: 2,
      scoreDelta: 4,
      recommendationConsistent: true,
    });
  });
});
