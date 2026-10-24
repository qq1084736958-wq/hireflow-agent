import { generateStructured } from "./model-client";
import { matchPrompt, resumeAnalysisPrompt } from "./prompts";
import {
  applyEvidenceVerification,
  calculateMatchScore,
  modelMatchResultSchema,
  resumeProfileSchema,
} from "./schemas";
import {
  claimNextResumeBatchItem,
  completeResumeBatchItem,
  failResumeBatchItem,
  getResumeBatch,
  refreshResumeBatchStatus,
  setResumeBatchItemPhase,
} from "./resume-batch-database";

const globalWorkers = globalThis as typeof globalThis & {
  activeResumeBatches?: Set<string>;
};

function activeBatches() {
  globalWorkers.activeResumeBatches ??= new Set<string>();
  return globalWorkers.activeResumeBatches;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function processItem(batchId: string) {
  const item = claimNextResumeBatchItem(batchId);
  if (!item) return false;
  try {
    const profile = await generateStructured({
      ...resumeAnalysisPrompt,
      schema: resumeProfileSchema,
      user: `候选人代号：${item.alias}\n\n已脱敏简历文本：\n${item.resumeText}`,
    });
    const safeProfile = { ...profile, candidateName: item.alias };
    setResumeBatchItemPhase(item.id, "matching");

    const modelResult = await generateStructured({
      ...matchPrompt,
      schema: modelMatchResultSchema,
      user: `岗位能力模型：\n${JSON.stringify(item.job, null, 2)}\n\n结构化简历：\n${JSON.stringify(safeProfile, null, 2)}\n\n简历原文（证据只能引用此处）：\n${item.resumeText}`,
    });
    const verifiedResult = applyEvidenceVerification(item.resumeText, modelResult);
    const score = calculateMatchScore(item.job, verifiedResult);
    const match = {
      ...verifiedResult,
      recommendation: score.guardrailReasons.length > 0 ? "待人工确认" as const : verifiedResult.recommendation,
      matches: verifiedResult.matches.map((matchItem) => ({ ...matchItem, scoreSource: "AI评分" as const })),
      ...score,
    };
    completeResumeBatchItem(item.id, { profile: safeProfile, resumeText: item.resumeText, match });
  } catch (error) {
    const message = error instanceof Error ? error.message : "候选人处理失败";
    failResumeBatchItem(item.id, message);
  }
  return true;
}

async function runBatch(batchId: string) {
  const workers = Array.from({ length: 2 }, async () => {
    while (true) {
      const processed = await processItem(batchId);
      if (processed) continue;
      const batch = getResumeBatch(batchId);
      if (!batch || batch.summary.processing === 0 && batch.summary.queued === 0) return;
      const retryTimes = batch.items
        .filter((item) => item.status === "queued" && item.nextRetryAt)
        .map((item) => new Date(item.nextRetryAt!).getTime());
      if (batch.summary.processing > 0 && retryTimes.length === 0) return;
      const nextRetry = retryTimes.length > 0 ? Math.min(...retryTimes) : Date.now() + 1_000;
      await delay(Math.min(5_000, Math.max(250, nextRetry - Date.now())));
    }
  });
  await Promise.all(workers);
  refreshResumeBatchStatus(batchId);
}

export function startResumeBatch(batchId: string) {
  const active = activeBatches();
  if (active.has(batchId)) return;
  const batch = getResumeBatch(batchId);
  if (!batch || batch.status === "completed" || batch.status === "completed_with_errors" || batch.status === "failed") return;
  active.add(batchId);
  void runBatch(batchId).finally(() => active.delete(batchId));
}
