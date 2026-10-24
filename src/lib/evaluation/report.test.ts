import { describe, expect, it } from "vitest";
import type { EvaluationCase, EvaluationRun, RuleScore } from "./types";
import { buildEvaluationReport, buildResultsCsv, collectBadcases } from "./report";

const testCase = { id: "c1", type: "edge", jobId: "j1", resumeId: "r1", expectedBand: "low", resumeText: "足够长的虚构简历文本用于测试自动评测报告生成，并确保这里不会依赖任何真实个人信息或企业内部数据。继续补充文字满足长度。", expectedGuardrail: true, mustNotInfer: [], notes: "测试" } satisfies EvaluationCase;
const run = { caseId: "c1", attempt: 1, startedAt: new Date(0).toISOString(), durationMs: 100, success: false, error: "失败", job: null, resume: null, resumeText: testCase.resumeText, match: null, questions: [], judge: null } satisfies EvaluationRun;
const score = { caseId: "c1", attempt: 1, workflowSuccess: false, requirementCoverage: 0, quoteLocationRate: 0, unsupportedHighScoreRate: 0, guardrailCorrect: false, expectedBand: "low", actualBand: null, bandCorrect: false, totalScore: null, durationMs: 100 } satisfies RuleScore;

describe("evaluation report", () => {
  it("exports stable CSV headers and rows", () => {
    const csv = buildResultsCsv([testCase], [run], [score]);
    expect(csv).toContain('"case_id"');
    expect(csv).toContain('"c1"');
  });

  it("promotes failed runs into badcases", () => {
    expect(collectBadcases([testCase], [run], [score])[0].reasons).toContain("工作流失败");
  });

  it("generates a report with evidence boundaries", () => {
    const report = buildEvaluationReport({ generatedAt: new Date(0).toISOString(), model: "test-model", cases: [testCase], runs: [run], scores: [score] });
    expect(report.markdown).toContain("HireFlow 30条离线自动评测报告");
    expect(report.markdown).toContain("不能证明真实企业上线");
  });
});
