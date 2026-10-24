import { describe, expect, it } from "vitest";
import { parseJsonContent } from "./model-client";
import {
  applyEvidenceVerification,
  calculateInterviewTotal,
  calculateMatchScore,
  calculateMatchTotal,
  normalizeRequirementWeights,
  locateEvidenceQuote,
  sanitizeJobAnalysis,
  type JobAnalysis,
  type ModelInterviewReport,
  type ModelMatchResult,
} from "./schemas";

const job: JobAnalysis = {
  title: "AI 产品经理",
  summary: "负责 AI 产品落地",
  responsibilities: ["推动产品上线"],
  ambiguities: [],
  requirements: [
    { id: "ai", label: "AI 产品", detail: "产品落地", weight: 3, kind: "必备" },
    { id: "result", label: "业务成果", detail: "量化结果", weight: 2, kind: "必备" },
  ],
};

describe("real agent chain", () => {
  it("parses plain and fenced JSON model output", () => {
    expect(parseJsonContent('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonContent('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("normalizes generated requirement weights to 100", () => {
    const normalized = normalizeRequirementWeights(job);
    expect(normalized.requirements.map((item) => item.weight)).toEqual([60, 40]);
  });

  it("calculates the final score in application code", () => {
    const normalized = normalizeRequirementWeights(job);
    const match: ModelMatchResult = {
      summary: "匹配",
      strengths: ["AI 项目"],
      gaps: ["成果不足"],
      risks: [],
      recommendation: "推荐面试",
      matches: [
        { requirementId: "ai", label: "AI 产品", status: "已满足", score: 90, evidenceQuote: "已上线", evidenceSource: "项目", reasoning: "有证据", interviewFocus: "追问范围" },
        { requirementId: "result", label: "业务成果", status: "部分满足", score: 70, evidenceQuote: "效率提升", evidenceSource: "项目", reasoning: "缺少基线", interviewFocus: "追问指标" },
      ],
    };
    expect(calculateMatchTotal(normalized, match)).toBe(82);
  });

  it("locates a verbatim evidence quote despite PDF whitespace differences", () => {
    const resumeText = "负责企业知识助手从0到1上线，并建立评测体系。";
    expect(locateEvidenceQuote(resumeText, "企业知识助手从 0 到 1 上线")).toEqual({
      start: 2,
      end: 14,
    });
  });

  it("downgrades an AI quote that cannot be found in the resume", () => {
    const normalized = normalizeRequirementWeights(job);
    const match: ModelMatchResult = {
      summary: "模型声称候选人具备 AI 背景",
      strengths: ["AI 项目"],
      gaps: ["结果待确认"],
      risks: [],
      recommendation: "推荐面试",
      matches: [
        { requirementId: "ai", label: "AI 产品", status: "已满足", score: 95, evidenceQuote: "主导多个大模型项目成功上线", evidenceSource: "工作经历", reasoning: "关键词匹配", interviewFocus: "追问项目" },
        { requirementId: "result", label: "业务成果", status: "部分满足", score: 70, evidenceQuote: "客户续约率提升 20%", evidenceSource: "项目经历", reasoning: "有量化结果", interviewFocus: "追问口径" },
      ],
    };
    const verified = applyEvidenceVerification("负责传统 SaaS 产品，客户续约率提升 20%。", match);
    const score = calculateMatchScore(normalized, verified);

    expect(verified.matches[0]).toMatchObject({
      status: "待验证",
      score: 30,
      evidenceVerification: "not_found",
      evidenceSource: "原文未定位",
    });
    expect(verified.matches[1].evidenceVerification).toBe("verified");
    expect(score.guardrailReasons).toContain("必备项引用无法在简历原文定位：AI 产品");
  });

  it("caps the final score when a required capability fails", () => {
    const guardedJob: JobAnalysis = {
      ...job,
      requirements: [
        { id: "core", label: "核心能力", detail: "必须具备", weight: 20, kind: "必备" },
        { id: "bonus", label: "加分能力", detail: "额外优势", weight: 80, kind: "加分" },
      ],
    };
    const match: ModelMatchResult = {
      summary: "边缘项很强但核心项缺失",
      strengths: ["加分能力突出"],
      gaps: ["核心能力缺失"],
      risks: [],
      recommendation: "待人工确认",
      matches: [
        { requirementId: "core", label: "核心能力", status: "不满足", score: 0, evidenceQuote: "", evidenceSource: "未提供", reasoning: "无证据", interviewFocus: "核实核心能力" },
        { requirementId: "bonus", label: "加分能力", status: "已满足", score: 100, evidenceQuote: "经验丰富", evidenceSource: "工作经历", reasoning: "证据充分", interviewFocus: "" },
      ],
    };

    expect(calculateMatchScore(guardedJob, match)).toEqual({
      rawScore: 80,
      totalScore: 60,
      scoreCap: 60,
      guardrailReasons: ["必备项未通过：核心能力"],
    });
  });

  it("caps verbose model output at ten unique requirements", () => {
    const verbose = {
      ...job,
      requirements: Array.from({ length: 12 }, (_, index) => ({
        id: `r-${index + 1}`,
        label: `能力 ${index + 1}`,
        detail: `要求 ${index + 1}`,
        weight: 10,
        kind: "必备" as const,
      })),
    };
    const sanitized = sanitizeJobAnalysis(verbose);
    expect(sanitized.requirements).toHaveLength(10);
    expect(sanitized.requirements.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
  });

  it("calculates the interview total from all question scores", () => {
    const report: ModelInterviewReport = {
      recommendation: "建议进入下一轮",
      executiveSummary: "整体表现稳定",
      strengths: ["证据清晰"],
      risks: [],
      followUps: [],
      evaluations: [
        { questionId: "q1", score: 90, starCompleteness: 88, evidenceConsistency: 92, professionalDepth: 90, strengths: ["结构完整"], concerns: [], feedback: "回答完整" },
        { questionId: "q2", score: 70, starCompleteness: 68, evidenceConsistency: 80, professionalDepth: 62, strengths: [], concerns: ["结果不够具体"], feedback: "需要追问" },
      ],
    };

    expect(calculateInterviewTotal(report)).toBe(80);
  });
});
