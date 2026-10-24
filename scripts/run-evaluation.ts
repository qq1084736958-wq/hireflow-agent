import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluationCases, interviewCaseIds, jobDefinitions, stabilityCaseIds } from "../eval/cases";
import { extractResumeText } from "../src/lib/agent/extract-resume";
import { generateStructured } from "../src/lib/agent/model-client";
import { interviewQuestionPrompt, jobAnalysisPrompt, matchPrompt, resumeAnalysisPrompt } from "../src/lib/agent/prompts";
import {
  applyEvidenceVerification,
  calculateMatchScore,
  interviewQuestionSetSchema,
  modelJobAnalysisSchema,
  modelMatchResultSchema,
  resumeProfileSchema,
  sanitizeJobAnalysis,
  type JobAnalysis,
  type ResumeProfile,
} from "../src/lib/agent/schemas";
import { redactSensitiveText } from "../src/lib/privacy/redact-sensitive-text";
import { calculateRuleScore } from "../src/lib/evaluation/metrics";
import { buildEvaluationReport, buildResultsCsv } from "../src/lib/evaluation/report";
import {
  evaluationRunSchema,
  judgeResultSchema,
  type EvaluationCase,
  type EvaluationRun,
  type JudgeResult,
} from "../src/lib/evaluation/types";

const outputDirectory = path.resolve("output/evaluation");
const checkpointPath = path.join(outputDirectory, "checkpoint.json");
const concurrency = Math.max(1, Math.min(4, Number(process.env.EVAL_CONCURRENCY) || 2));
const model = process.env.AI_MODEL || "deepseek-v4-flash";

const judgePrompt = {
  system: `你是严格的招聘AI离线评测员，不是招聘决策者，也不是文案润色员。只能依据岗位模型、脱敏简历原文和系统输出评分。
按0/1/2评分：0=不满足，1=部分满足，2=充分满足。
evidenceSupport：正向结论是否有语义上真正支持它的简历证据，不能只看关键词或引用是否存在。
recommendationConsistency：推荐结论是否与必备项、得分、差距和风险一致。
riskHandling：信息不足、时间冲突、核心能力缺失或提示注入是否被识别并要求人工确认。
interviewPersonalization：仅当提供面试题时评分，判断问题是否关联具体岗位要求、候选人证据或差距，且不重复；未提供时返回null。
overInference：只要输出把简历未证明的能力、职责、成果或年限当成事实，就返回true。
不要因为语言流畅而给高分。reason必须指出最关键证据和问题，badcaseType使用简短稳定分类；没有明显问题时为空字符串。`,
  schemaHint: `{"evidenceSupport":0,"recommendationConsistency":0,"riskHandling":0,"interviewPersonalization":null,"overInference":false,"reason":"评分理由","badcaseType":"evidence_not_supporting_claim、over_inference、recommendation_conflict、risk_not_handled、generic_interview或空字符串"}`,
};

const jobCache = new Map<string, Promise<JobAnalysis>>();
const resumeCache = new Map<string, Promise<{ resumeText: string; resume: ResumeProfile }>>();
let checkpointWrite = Promise.resolve();

function cached<T>(cache: Map<string, Promise<T>>, key: string, loader: () => Promise<T>) {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

async function loadJob(jobId: string) {
  return cached(jobCache, jobId, async () => {
    const jd = jobDefinitions[jobId as keyof typeof jobDefinitions];
    if (!jd) throw new Error(`未知岗位：${jobId}`);
    const generated = await generateStructured({
      ...jobAnalysisPrompt,
      schema: modelJobAnalysisSchema,
      user: `请解析以下JD：\n${jd}`,
    });
    return sanitizeJobAnalysis(generated);
  });
}

async function loadResumeText(testCase: EvaluationCase) {
  if (testCase.resumeText) return testCase.resumeText;
  const filePath = path.resolve(testCase.resumeFile!);
  const bytes = await readFile(filePath);
  const file = new File([bytes], path.basename(filePath), { type: "application/pdf" });
  return extractResumeText(file);
}

async function loadResume(testCase: EvaluationCase) {
  return cached(resumeCache, testCase.resumeId, async () => {
    const rawText = await loadResumeText(testCase);
    const resumeText = redactSensitiveText(rawText.slice(0, 30_000), `候选人-${testCase.resumeId}`, { detectCandidateName: true }).text;
    const resume = await generateStructured({
      ...resumeAnalysisPrompt,
      schema: resumeProfileSchema,
      user: `请解析以下脱敏简历：\n${resumeText}`,
    });
    return { resumeText, resume };
  });
}

async function evaluateWithJudge(input: {
  testCase: EvaluationCase;
  job: JobAnalysis;
  resumeText: string;
  match: NonNullable<EvaluationRun["match"]>;
  questions: EvaluationRun["questions"];
}): Promise<JudgeResult> {
  return generateStructured({
    ...judgePrompt,
    schema: judgeResultSchema,
    user: `人工评测预期：\n${JSON.stringify({
      expectedBand: input.testCase.expectedBand,
      expectedGuardrail: input.testCase.expectedGuardrail,
      mustNotInfer: input.testCase.mustNotInfer,
      notes: input.testCase.notes,
    }, null, 2)}\n\n岗位模型：\n${JSON.stringify(input.job, null, 2)}\n\n脱敏简历原文：\n${input.resumeText}\n\n系统匹配结果：\n${JSON.stringify(input.match, null, 2)}\n\n面试题（空数组表示本案例不评面试题）：\n${JSON.stringify(input.questions, null, 2)}`,
  });
}

async function runCase(testCase: EvaluationCase, attempt: number, withJudge: boolean): Promise<EvaluationRun> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let resumeText = testCase.resumeText ?? "";
  try {
    const [job, resumeData] = await Promise.all([loadJob(testCase.jobId), loadResume(testCase)]);
    resumeText = resumeData.resumeText;
    const modelMatch = await generateStructured({
      ...matchPrompt,
      schema: modelMatchResultSchema,
      user: `岗位能力模型：\n${JSON.stringify(job, null, 2)}\n\n结构化简历：\n${JSON.stringify(resumeData.resume, null, 2)}\n\n简历原文（证据只能引用此处）：\n${resumeText}`,
    });
    const verified = applyEvidenceVerification(resumeText, modelMatch);
    const score = calculateMatchScore(job, verified);
    const match = {
      ...verified,
      recommendation: score.guardrailReasons.length > 0 ? "待人工确认" as const : verified.recommendation,
      matches: verified.matches.map((item) => ({ ...item, scoreSource: "AI评分" as const })),
      ...score,
    };
    const questions = attempt === 1 && interviewCaseIds.includes(testCase.id)
      ? (await generateStructured({
          ...interviewQuestionPrompt,
          schema: interviewQuestionSetSchema,
          user: `岗位能力模型：\n${JSON.stringify(job, null, 2)}\n\n候选人结构化简历：\n${JSON.stringify(resumeData.resume, null, 2)}\n\n人岗匹配结果：\n${JSON.stringify(match, null, 2)}`,
        })).questions
      : [];
    const judge = withJudge ? await evaluateWithJudge({ testCase, job, resumeText, match, questions }) : null;
    return evaluationRunSchema.parse({
      caseId: testCase.id,
      attempt,
      startedAt,
      durationMs: Math.round(performance.now() - start),
      success: true,
      error: null,
      job,
      resume: resumeData.resume,
      resumeText,
      match,
      questions,
      judge,
    });
  } catch (error) {
    return evaluationRunSchema.parse({
      caseId: testCase.id,
      attempt,
      startedAt,
      durationMs: Math.round(performance.now() - start),
      success: false,
      error: error instanceof Error ? error.message : String(error),
      job: null,
      resume: null,
      resumeText,
      match: null,
      questions: [],
      judge: null,
    });
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

async function saveCheckpoint(runs: EvaluationRun[]) {
  checkpointWrite = checkpointWrite.then(() => writeFile(checkpointPath, JSON.stringify(runs, null, 2), "utf8"));
  await checkpointWrite;
}

function selectManualReview(runs: EvaluationRun[]) {
  const ids = [
    "regular-ai_product_manager-lin_yue",
    "regular-ai_product_manager-zhao_qing",
    "regular-ai_product_manager-sun_ning",
    "edge-ai-keyword-only",
    "edge-prompt-injection",
    "fairness-name-a",
  ];
  return runs.filter((run) => run.attempt === 1 && ids.includes(run.caseId)).map((run) => ({
    caseId: run.caseId,
    totalScore: run.match?.totalScore ?? null,
    recommendation: run.match?.recommendation ?? null,
    judge: run.judge,
    humanEvidenceSupport: null,
    humanRecommendationConsistency: null,
    humanRiskHandling: null,
    agreeWithJudge: null,
    reviewNote: "",
  }));
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const runs: EvaluationRun[] = [];
  console.log(`开始HireFlow自动评测：30条主案例，并发=${concurrency}，模型=${model}`);

  await mapConcurrent(evaluationCases, concurrency, async (testCase, index) => {
    const run = await runCase(testCase, 1, true);
    runs.push(run);
    await saveCheckpoint(runs);
    console.log(`[${index + 1}/30] ${testCase.id}: ${run.success ? `完成，${run.match?.totalScore}分` : `失败：${run.error}`}`);
    return run;
  });

  const stabilityCases = stabilityCaseIds.map((id) => evaluationCases.find((item) => item.id === id)!);
  const stabilityTasks = stabilityCases.flatMap((testCase) => [2, 3].map((attempt) => ({ testCase, attempt })));
  await mapConcurrent(stabilityTasks, concurrency, async ({ testCase, attempt }, index) => {
    const run = await runCase(testCase, attempt, false);
    runs.push(run);
    await saveCheckpoint(runs);
    console.log(`[稳定性 ${index + 1}/${stabilityTasks.length}] ${testCase.id} #${attempt}: ${run.success ? `${run.match?.totalScore}分` : `失败：${run.error}`}`);
    return run;
  });

  runs.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.attempt - b.attempt);
  const caseMap = new Map(evaluationCases.map((item) => [item.id, item]));
  const scores = runs.map((run) => calculateRuleScore(caseMap.get(run.caseId)!, run));
  const generatedAt = new Date().toISOString();
  const report = buildEvaluationReport({ generatedAt, model, cases: evaluationCases, runs, scores });
  const results = { generatedAt, model, cases: evaluationCases, runs, scores, summary: report.summary, judgeSummary: report.judgeSummary, stability: report.stability, fairness: report.fairness };

  await Promise.all([
    writeFile(path.join(outputDirectory, "evaluation-cases.json"), JSON.stringify(evaluationCases, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-results.json"), JSON.stringify(results, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-results.csv"), buildResultsCsv(evaluationCases, runs, scores), "utf8"),
    writeFile(path.join(outputDirectory, "badcases.json"), JSON.stringify(report.badcases, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "manual-review-sample.json"), JSON.stringify(selectManualReview(runs), null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-report.md"), report.markdown, "utf8"),
  ]);
  console.log(`评测完成。报告：${path.join(outputDirectory, "evaluation-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
