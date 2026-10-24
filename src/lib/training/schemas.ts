import { z } from "zod";

export const trainingModuleSchema = z.object({
  title: z.string().min(1),
  purpose: z.string().min(1),
  content: z.string().min(1),
  talkingPoints: z.array(z.string().min(1)).min(2).max(5),
});

export const trainingPlanSchema = z.object({
  title: z.string().min(1),
  audience: z.string().min(1),
  objective: z.string().min(1),
  durationMinutes: z.number().int().min(10).max(240),
  modules: z.array(trainingModuleSchema).min(3).max(6),
  keyTakeaways: z.array(z.string().min(1)).min(3).max(6),
  scenario: z.object({
    roleName: z.string().min(1),
    roleProfile: z.string().min(1),
    learnerGoal: z.string().min(1),
    openingMessage: z.string().min(1),
    evaluationCriteria: z.array(z.string().min(1)).min(3).max(6),
  }),
});

export const trainingMessageSchema = z.object({
  role: z.enum(["learner", "coach"]),
  content: z.string().min(1).max(4_000),
});

export const trainingBriefSchema = z.object({
  traineeName: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(2).max(200),
  audience: z.string().trim().min(2).max(200),
  objective: z.string().trim().min(10).max(1_000),
  context: z.string().trim().min(20).max(4_000),
});

export const roleplayReplySchema = z.object({
  reply: z.string().min(1).max(2_000),
  behaviorTag: z.string().min(1),
});

const evidenceStrengthSchema = z.enum(["具体行为证据", "部分行为证据", "仅态度表达", "无有效证据"]);
const evaluationConfidenceSchema = z.enum(["高", "中", "低"]);
const behaviorEvidenceSchema = z.object({
  action: z.string(),
  counterpartReaction: z.string(),
  outcome: z.string(),
});

const trainingDimensionBaseSchema = z.object({
  label: z.string().min(1),
  score: z.coerce.number().min(0).max(100),
  evidence: z.string().min(1),
  feedback: z.string().min(1),
});

export const modelTrainingDimensionSchema = trainingDimensionBaseSchema.extend({
  evidenceStrength: evidenceStrengthSchema,
  confidence: evaluationConfidenceSchema,
  behaviorEvidence: behaviorEvidenceSchema,
});

export const trainingDimensionSchema = trainingDimensionBaseSchema.extend({
  evidenceStrength: evidenceStrengthSchema.optional(),
  confidence: evaluationConfidenceSchema.optional(),
  behaviorEvidence: behaviorEvidenceSchema.optional(),
  rawScore: z.number().min(0).max(100).optional(),
  guardrailReason: z.string().optional(),
});

const recommendationSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  if (/未通过|不通过|辅导|指导|基础薄弱/.test(normalized)) return "需要辅导";
  if (/再次|继续|重练|练习|改进/.test(normalized)) return "建议再次练习";
  if (/通过|合格|达标/.test(normalized)) return "通过";
  return normalized;
}, z.enum(["通过", "建议再次练习", "需要辅导"]));

export const modelTrainingReportSchema = z.object({
  summary: z.string().min(1),
  recommendation: recommendationSchema,
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  nextActions: z.array(z.string()).min(1),
  dimensions: z.array(modelTrainingDimensionSchema).min(3).max(6),
});

export const trainingReportSchema = z.object({
  summary: z.string().min(1),
  recommendation: recommendationSchema,
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  nextActions: z.array(z.string()).min(1),
  dimensions: z.array(trainingDimensionSchema).min(3).max(6),
  overallScore: z.number().min(0).max(100),
});

export const trainingRecordSnapshotSchema = z.object({
  id: z.string().uuid(),
  brief: trainingBriefSchema,
  plan: trainingPlanSchema,
  messages: z.array(trainingMessageSchema).min(2).max(20),
  report: trainingReportSchema,
});

export const createTrainingRecordSchema = trainingRecordSnapshotSchema.omit({ id: true });

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
export type TrainingMessage = z.infer<typeof trainingMessageSchema>;
export type TrainingReport = z.infer<typeof trainingReportSchema>;
export type ModelTrainingReport = z.infer<typeof modelTrainingReportSchema>;
export type TrainingBrief = z.infer<typeof trainingBriefSchema>;
export type TrainingRecordSnapshot = z.infer<typeof trainingRecordSnapshotSchema>;
export type CreateTrainingRecordInput = z.infer<typeof createTrainingRecordSchema>;

export interface TrainingRecord {
  id: string;
  snapshot: TrainingRecordSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecordSummary {
  id: string;
  title: string;
  traineeName: string;
  overallScore: number;
  recommendation: string;
  learnerTurns: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAnalytics {
  metrics: {
    totalCompletions: number;
    uniqueLearners: number;
    averageScore: number;
    passRate: number;
    averageTurns: number;
  };
  dimensionAverages: Array<{ label: string; averageScore: number; sampleSize: number }>;
  learners: Array<{ traineeName: string; attempts: number; averageScore: number; bestScore: number; latestAt: string; latestRecordId: string }>;
  topics: Array<{ topic: string; attempts: number; averageScore: number }>;
  trend: Array<{ date: string; attempts: number; averageScore: number }>;
  availableTopics: string[];
}

export function calculateTrainingTotal(report: ModelTrainingReport) {
  return Math.round(report.dimensions.reduce((sum, item) => sum + item.score, 0) / report.dimensions.length);
}

export function applyTrainingEvidenceGuardrails(report: ModelTrainingReport, learnerTurns: number): TrainingReport {
  const evidenceCaps = {
    "具体行为证据": 100,
    "部分行为证据": 75,
    "仅态度表达": 50,
    "无有效证据": 30,
  } as const;

  const missingPattern = /^(?:未体现|未提供|无|无法判断|对话中未出现|没有直接证据)[。.!！]?$/;
  const dimensions = report.dimensions.map((item) => {
    const missingParts = Object.values(item.behaviorEvidence).filter((value) => missingPattern.test(value.trim())).length;
    const evidenceCap = evidenceCaps[item.evidenceStrength];
    const completenessCap = missingParts >= 2 ? 55 : missingParts === 1 ? 75 : 100;
    const turnCap = learnerTurns < 2 ? 70 : 100;
    const cap = Math.min(evidenceCap, completenessCap, turnCap);
    const score = Math.min(item.score, cap);
    const guardrailReason = score < item.score
      ? `证据保护：${item.evidenceStrength}，行为链缺失 ${missingParts} 项${learnerTurns < 2 ? "，有效练习轮次不足" : ""}`
      : undefined;

    return {
      ...item,
      score,
      rawScore: score < item.score ? item.score : undefined,
      confidence: learnerTurns < 2 || missingParts >= 2 ? "低" as const : item.confidence,
      guardrailReason,
    };
  });

  const guardedReport = { ...report, dimensions };
  const overallScore = calculateTrainingTotal(guardedReport);
  return {
    ...guardedReport,
    recommendation: overallScore < 60 ? "需要辅导" : overallScore < 80 ? "建议再次练习" : report.recommendation,
    overallScore,
  };
}
