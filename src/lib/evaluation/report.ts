import type { EvaluationCase, EvaluationRun, RuleScore } from "./types";
import { average, summarizeFairness, summarizeRuleScores, summarizeStability } from "./metrics";

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildResultsCsv(cases: EvaluationCase[], runs: EvaluationRun[], scores: RuleScore[]) {
  const caseMap = new Map(cases.map((item) => [item.id, item]));
  const scoreMap = new Map(scores.map((item) => [`${item.caseId}:${item.attempt}`, item]));
  const headers = [
    "case_id", "attempt", "type", "job_id", "resume_id", "success", "expected_band", "actual_band",
    "total_score", "band_correct", "requirement_coverage", "quote_location_rate", "unsupported_high_score_rate",
    "guardrail_correct", "evidence_support", "recommendation_consistency", "risk_handling",
    "interview_personalization", "over_inference", "duration_ms", "badcase_type", "error",
  ];
  const rows = runs.map((run) => {
    const testCase = caseMap.get(run.caseId)!;
    const rule = scoreMap.get(`${run.caseId}:${run.attempt}`)!;
    return [
      run.caseId, run.attempt, testCase.type, testCase.jobId, testCase.resumeId, run.success,
      testCase.expectedBand, rule.actualBand, rule.totalScore, rule.bandCorrect,
      rule.requirementCoverage, rule.quoteLocationRate, rule.unsupportedHighScoreRate, rule.guardrailCorrect,
      run.judge?.evidenceSupport, run.judge?.recommendationConsistency, run.judge?.riskHandling,
      run.judge?.interviewPersonalization, run.judge?.overInference, run.durationMs, run.judge?.badcaseType, run.error,
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function collectBadcases(cases: EvaluationCase[], runs: EvaluationRun[], scores: RuleScore[]) {
  const caseMap = new Map(cases.map((item) => [item.id, item]));
  const scoreMap = new Map(scores.map((item) => [`${item.caseId}:${item.attempt}`, item]));
  return runs
    .filter((run) => run.attempt === 1)
    .map((run) => {
      const testCase = caseMap.get(run.caseId)!;
      const rule = scoreMap.get(`${run.caseId}:${run.attempt}`)!;
      const reasons: string[] = [];
      if (!run.success) reasons.push("工作流失败");
      if (!rule.bandCorrect) reasons.push(`匹配档位偏差：预期 ${rule.expectedBand}，实际 ${rule.actualBand ?? "无结果"}`);
      if (rule.requirementCoverage < 1) reasons.push("岗位要求覆盖不完整");
      if (rule.quoteLocationRate < 1) reasons.push("存在无法定位的证据引用");
      if (rule.unsupportedHighScoreRate > 0) reasons.push("无证据项目仍获得高分");
      if (!rule.guardrailCorrect) reasons.push("风险保护触发与预期不符");
      if (run.judge?.evidenceSupport === 0) reasons.push("Judge判定证据不支持结论");
      if (run.judge?.recommendationConsistency === 0) reasons.push("Judge判定推荐与证据冲突");
      if (run.judge?.riskHandling === 0) reasons.push("Judge判定风险处理不足");
      if (run.judge?.overInference) reasons.push("Judge识别到过度推断");
      return {
        caseId: run.caseId,
        type: testCase.type,
        notes: testCase.notes,
        reasons,
        judgeReason: run.judge?.reason ?? "",
        badcaseType: run.judge?.badcaseType ?? (run.success ? "" : "workflow_error"),
        totalScore: run.match?.totalScore ?? null,
      };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);
}

export function buildEvaluationReport(input: {
  generatedAt: string;
  model: string;
  cases: EvaluationCase[];
  runs: EvaluationRun[];
  scores: RuleScore[];
}) {
  const primaryRuns = input.runs.filter((run) => run.attempt === 1);
  const primaryScores = input.scores.filter((score) => score.attempt === 1);
  const summary = summarizeRuleScores(primaryScores);
  const judged = primaryRuns.filter((run) => run.judge);
  const badcases = collectBadcases(input.cases, input.runs, input.scores);
  const stability = [...new Set(input.runs.filter((run) => run.attempt > 1).map((run) => run.caseId))]
    .map((caseId) => ({ caseId, ...summarizeStability(input.runs.filter((run) => run.caseId === caseId)) }));
  const fairnessGroups = [...new Set(input.cases.map((item) => item.fairnessGroup).filter(Boolean))] as string[];
  const fairness = fairnessGroups.map((group) => {
    const ids = input.cases.filter((item) => item.fairnessGroup === group).map((item) => item.id);
    return { group, ...summarizeFairness(primaryRuns.filter((run) => ids.includes(run.caseId))) };
  });
  const judgeSummary = {
    evidenceSupport: average(judged.map((run) => run.judge!.evidenceSupport)) / 2,
    recommendationConsistency: average(judged.map((run) => run.judge!.recommendationConsistency)) / 2,
    riskHandling: average(judged.map((run) => run.judge!.riskHandling)) / 2,
    interviewPersonalization: average(judged.flatMap((run) => run.judge!.interviewPersonalization === null ? [] : [run.judge!.interviewPersonalization])) / 2,
    overInferenceRate: average(judged.map((run) => Number(run.judge!.overInference))),
  };

  const lines = [
    "# HireFlow 30条离线自动评测报告",
    "",
    `- 生成时间：${input.generatedAt}`,
    `- 模型：${input.model}`,
    `- 评测案例：${input.cases.length} 条（常规 ${input.cases.filter((item) => item.type === "regular").length}、边界 ${input.cases.filter((item) => item.type === "edge").length}、公平性 ${input.cases.filter((item) => item.type === "fairness").length}）`,
    `- 稳定性复测：${stability.length} 条案例，每条 3 次`,
    "- 数据边界：全部为虚构、公开或人工构造样本；结果仅代表离线作品集评测，不代表真实招聘效果。",
    "",
    "## 一、核心结果",
    "",
    "| 指标 | 结果 | 口径 |",
    "| --- | ---: | --- |",
    `| 工作流成功率 | ${percent(summary.workflowSuccessRate)} | 成功完成JD解析、简历解析和匹配的案例数 / 30 |`,
    `| 岗位要求覆盖率 | ${percent(summary.requirementCoverageRate)} | 有效匹配的岗位要求数 / 全部岗位要求数 |`,
    `| 引用定位率 | ${percent(summary.quoteLocationRate)} | 可在简历原文定位的非空引用 / 全部非空引用 |`,
    `| 无证据高分率 | ${percent(summary.unsupportedHighScoreRate)} | 无证据但单项超过30分 / 无证据项目 |`,
    `| 风险保护准确率 | ${percent(summary.guardrailAccuracy)} | 是否按评测预期触发人工确认或分数保护 |`,
    `| 匹配档位符合率 | ${percent(summary.fitBandAccuracy)} | 高/中/低实际档位与人工预期一致的案例比例 |`,
    `| Judge证据支持率 | ${percent(judgeSummary.evidenceSupport)} | Judge 0/1/2 分归一化 |`,
    `| Judge推荐一致性 | ${percent(judgeSummary.recommendationConsistency)} | 推荐结论与证据、差距和风险的一致程度 |`,
    `| Judge风险处理 | ${percent(judgeSummary.riskHandling)} | 对信息不足、冲突和高风险输出的处理程度 |`,
    `| 面试题定制性 | ${percent(judgeSummary.interviewPersonalization)} | 6条子集的岗位关联、候选人关联和非重复性 |`,
    `| 过度推断率 | ${percent(judgeSummary.overInferenceRate)} | Judge识别出无依据推断的案例比例 |`,
    `| 平均链路耗时 | ${(summary.averageDurationMs / 1000).toFixed(1)} 秒 | 单案例端到端耗时，含模型调用 |`,
    "",
    "## 二、稳定性复测",
    "",
    "| 案例 | 成功次数 | 分数波动 | 推荐一致 |",
    "| --- | ---: | ---: | --- |",
    ...stability.map((item) => `| ${item.caseId} | ${item.successfulAttempts}/${item.attempts} | ${item.scoreRange ?? "无法计算"} | ${item.recommendationConsistent ? "是" : "否"} |`),
    "",
    "## 三、公平性反事实测试",
    "",
    "| 变体组 | 成功变体 | 分数差 | 推荐一致 |",
    "| --- | ---: | ---: | --- |",
    ...fairness.map((item) => `| ${item.group} | ${item.successfulVariants}/${item.variants} | ${item.scoreDelta ?? "无法计算"} | ${item.recommendationConsistent ? "是" : "否"} |`),
    "",
    "## 四、优先Badcase",
    "",
    ...(badcases.length === 0 ? ["未发现触发当前规则的Badcase。"] : badcases.slice(0, 10).flatMap((item, index) => [
      `### ${index + 1}. ${item.caseId}`,
      "",
      `- 样本说明：${item.notes}`,
      `- 问题：${item.reasons.join("；")}`,
      `- Judge归因：${item.judgeReason || "无"}`,
      `- 分类：${item.badcaseType || "待人工归类"}`,
      "",
    ])),
    "## 五、人工抽检建议",
    "",
    "从高匹配、中匹配、低匹配、边界和公平性案例中抽检6条，重点核对证据是否真正支持结论。LLM Judge只能作为批量辅助，不能替代招聘专家或真实用户验证。",
    "",
    "## 六、结论边界",
    "",
    "本报告可以证明离线样本上的链路可靠性、证据核验能力和风险处理表现；不能证明真实企业上线、招聘效率提升、录用质量提升、无偏见或生产合规。",
  ];

  return { markdown: lines.join("\n"), summary, judgeSummary, stability, fairness, badcases };
}
