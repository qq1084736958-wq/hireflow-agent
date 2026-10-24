import { describe, expect, it } from "vitest";
import { applyTrainingEvidenceGuardrails, calculateTrainingTotal, createTrainingRecordSchema, modelTrainingReportSchema, type ModelTrainingReport } from "./schemas";

const behaviorEvidence = {
  evidenceStrength: "具体行为证据" as const,
  confidence: "高" as const,
  behaviorEvidence: { action: "主动询问", counterpartReaction: "客户说明顾虑", outcome: "约定下一步" },
};

describe("training evaluation", () => {
  it("calculates the overall score from every dimension", () => {
    const report: ModelTrainingReport = {
      summary: "表现稳定",
      recommendation: "通过",
      strengths: ["结构清晰"],
      improvements: ["加强追问"],
      nextActions: ["再次练习"],
      dimensions: [
        { label: "需求洞察", score: 90, evidence: "主动提问", feedback: "继续保持", ...behaviorEvidence },
        { label: "异议处理", score: 70, evidence: "解释价值", feedback: "需要确认客户接受度", ...behaviorEvidence },
      ],
    };
    expect(calculateTrainingTotal(report)).toBe(80);
  });

  it("normalizes common model variations in scores and recommendations", () => {
    const report = modelTrainingReportSchema.parse({
      summary: "表现稳定",
      recommendation: "建议继续练习并改进",
      strengths: ["能够主动提问"],
      improvements: ["加强价值量化"],
      nextActions: ["完成下一轮练习"],
      dimensions: [
        { label: "需求洞察", score: "82", evidence: "询问客户顾虑", feedback: "继续追问", ...behaviorEvidence },
        { label: "价值表达", score: 76, evidence: "说明节省时间", feedback: "补充数据", ...behaviorEvidence },
        { label: "推进能力", score: 70, evidence: "提出下一步", feedback: "确认时间", ...behaviorEvidence },
      ],
    });

    expect(report.recommendation).toBe("建议再次练习");
    expect(report.dimensions[0].score).toBe(82);
  });

  it("caps keyword-only empathy claims without a complete behavior chain", () => {
    const report: ModelTrainingReport = {
      summary: "使用了安抚表达，但没有验证客户感受",
      recommendation: "建议再次练习",
      strengths: ["表达礼貌"],
      improvements: ["确认对方反应"],
      nextActions: ["补充追问"],
      dimensions: [{
        label: "情绪安抚",
        score: 92,
        evidence: "非常抱歉，我马上处理",
        feedback: "缺少对方反应和解决结果",
        evidenceStrength: "仅态度表达",
        confidence: "中",
        behaviorEvidence: { action: "表达歉意", counterpartReaction: "未体现", outcome: "未体现" },
      }],
    };

    const guarded = applyTrainingEvidenceGuardrails(report, 2);
    expect(guarded.dimensions[0].score).toBe(50);
    expect(guarded.dimensions[0].rawScore).toBe(92);
    expect(guarded.dimensions[0].confidence).toBe("低");
    expect(guarded.dimensions[0].guardrailReason).toContain("仅态度表达");
  });

  it("validates a complete persisted training record", () => {
    const result = createTrainingRecordSchema.safeParse({
      brief: { traineeName: "陈晨", topic: "价格异议处理", audience: "新销售", objective: "能够识别异议并推进下一步会议", context: "客户认为软件报价过高，并担心系统实施周期和数据安全风险。" },
      plan: {
        title: "价格异议处理训练", audience: "新销售", objective: "推进方案评审", durationMinutes: 45,
        modules: [1, 2, 3].map((index) => ({ title: `模块${index}`, purpose: "掌握方法", content: "具体训练内容", talkingPoints: ["主动提问", "确认需求"] })),
        keyTakeaways: ["先诊断", "讲价值", "定下一步"],
        scenario: { roleName: "采购总监", roleProfile: "关注成本与风险", learnerGoal: "处理价格异议", openingMessage: "你们价格太高。", evaluationCriteria: ["需求洞察", "价值表达", "推进能力"] },
      },
      messages: [{ role: "coach", content: "你们价格太高。" }, { role: "learner", content: "您最担心成本还是实施风险？" }],
      report: {
        summary: "能够主动提问", recommendation: "建议再次练习", strengths: ["主动诊断"], improvements: ["加强量化"], nextActions: ["再次练习"], overallScore: 76,
        dimensions: ["需求洞察", "价值表达", "推进能力"].map((label) => ({ label, score: 76, evidence: "主动提问", feedback: "继续加强" })),
      },
    });

    expect(result.success).toBe(true);
  });
});
