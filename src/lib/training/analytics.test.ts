import { describe, expect, it } from "vitest";
import { calculateTrainingAnalytics } from "./analytics";
import type { TrainingRecord } from "./schemas";

function record(id: string, traineeName: string, topic: string, score: number, recommendation: "通过" | "建议再次练习", date: string): TrainingRecord {
  return {
    id,
    createdAt: date,
    updatedAt: date,
    snapshot: {
      id,
      brief: { traineeName, topic, audience: "销售", objective: "完成一次有效的客户沟通练习", context: "客户对价格和实施风险均存在明确顾虑，需要销售进行回应。" },
      plan: {
        title: topic, audience: "销售", objective: "推进下一步", durationMinutes: 45,
        modules: [1, 2, 3].map((index) => ({ title: `模块${index}`, purpose: "练习", content: "内容", talkingPoints: ["提问", "确认"] })),
        keyTakeaways: ["诊断", "价值", "推进"],
        scenario: { roleName: "客户", roleProfile: "谨慎", learnerGoal: "推进会议", openingMessage: "价格太高", evaluationCriteria: ["需求洞察", "价值表达", "推进能力"] },
      },
      messages: [{ role: "coach", content: "价格太高" }, { role: "learner", content: "您最关注什么？" }],
      report: {
        summary: "完成练习", recommendation, strengths: ["提问"], improvements: ["量化"], nextActions: ["复练"], overallScore: score,
        dimensions: ["需求洞察", "价值表达", "推进能力"].map((label) => ({ label, score, evidence: "提问", feedback: "继续" })),
      },
    },
  };
}

describe("training analytics", () => {
  const records = [
    record("11111111-1111-4111-8111-111111111111", "陈晨", "价格异议", 80, "通过", "2026-07-20T10:00:00.000Z"),
    record("22222222-2222-4222-8222-222222222222", "陈晨", "价格异议", 60, "建议再次练习", "2026-07-21T10:00:00.000Z"),
    record("33333333-3333-4333-8333-333333333333", "林悦", "需求访谈", 90, "通过", "2026-07-22T10:00:00.000Z"),
  ];

  it("calculates actionable team metrics", () => {
    const analytics = calculateTrainingAnalytics(records, {}, new Date("2026-07-22T12:00:00.000Z"));
    expect(analytics.metrics).toEqual({ totalCompletions: 3, uniqueLearners: 2, averageScore: 77, passRate: 67, averageTurns: 1 });
    expect(analytics.learners[0].traineeName).toBe("林悦");
    expect(analytics.dimensionAverages[0].averageScore).toBe(77);
  });

  it("filters by topic and time window", () => {
    const analytics = calculateTrainingAnalytics(records, { topic: "价格异议", days: 3 }, new Date("2026-07-22T12:00:00.000Z"));
    expect(analytics.metrics.totalCompletions).toBe(2);
    expect(analytics.metrics.averageScore).toBe(70);
    expect(analytics.availableTopics).toEqual(["价格异议", "需求访谈"]);
  });
});
