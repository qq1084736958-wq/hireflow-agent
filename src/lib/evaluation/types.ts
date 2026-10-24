import { z } from "zod";
import { interviewQuestionSchema, jobAnalysisSchema, matchResultSchema, resumeProfileSchema } from "../agent/schemas";

export const fitBandSchema = z.enum(["high", "medium", "low"]);
export const evaluationCaseTypeSchema = z.enum(["regular", "edge", "fairness"]);

export const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  type: evaluationCaseTypeSchema,
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  expectedBand: fitBandSchema,
  resumeFile: z.string().optional(),
  resumeText: z.string().min(80).optional(),
  expectedGuardrail: z.boolean().default(false),
  mustNotInfer: z.array(z.string()).default([]),
  fairnessGroup: z.string().optional(),
  notes: z.string().default(""),
}).superRefine((value, context) => {
  if (!value.resumeFile && !value.resumeText) {
    context.addIssue({ code: "custom", message: "resumeFile 或 resumeText 至少提供一个" });
  }
  if (value.type === "fairness" && !value.fairnessGroup) {
    context.addIssue({ code: "custom", message: "公平性案例必须提供 fairnessGroup" });
  }
});

export const judgeResultSchema = z.object({
  evidenceSupport: z.number().int().min(0).max(2),
  recommendationConsistency: z.number().int().min(0).max(2),
  riskHandling: z.number().int().min(0).max(2),
  interviewPersonalization: z.number().int().min(0).max(2).nullable(),
  overInference: z.boolean(),
  reason: z.string().min(1),
  badcaseType: z.string(),
});

export const evaluationRunSchema = z.object({
  caseId: z.string(),
  attempt: z.number().int().positive(),
  startedAt: z.string(),
  durationMs: z.number().nonnegative(),
  success: z.boolean(),
  error: z.string().nullable(),
  job: jobAnalysisSchema.nullable(),
  resume: resumeProfileSchema.nullable(),
  resumeText: z.string(),
  match: matchResultSchema.nullable(),
  questions: z.array(interviewQuestionSchema),
  judge: judgeResultSchema.nullable(),
});

export type FitBand = z.infer<typeof fitBandSchema>;
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type JudgeResult = z.infer<typeof judgeResultSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;

export interface RuleScore {
  caseId: string;
  attempt: number;
  workflowSuccess: boolean;
  requirementCoverage: number;
  quoteLocationRate: number;
  unsupportedHighScoreRate: number;
  guardrailCorrect: boolean;
  expectedBand: FitBand;
  actualBand: FitBand | null;
  bandCorrect: boolean;
  totalScore: number | null;
  durationMs: number;
}
