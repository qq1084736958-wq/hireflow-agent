import { z } from "zod";
import {
  interviewQuestionSchema,
  interviewReportSchema,
  jobAnalysisSchema,
  matchResultSchema,
  resumeProfileSchema,
} from "../agent/schemas";

export const projectStageSchema = z.enum(["job", "resume", "match", "interview", "report"]);

export const candidateInterviewSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed", "skipped"]),
  questions: z.array(interviewQuestionSchema).max(8),
  answers: z.record(z.string(), z.string()),
  answerSources: z.record(z.string(), z.enum(["manual", "simulated"])).optional(),
  report: interviewReportSchema.nullable(),
});

export const hrDecisionStatusSchema = z.enum(["pending", "shortlisted", "hold", "rejected"]);
export const hrDecisionReasonSchema = z.enum([
  "核心能力符合",
  "需要补充面试",
  "薪酬期望待确认",
  "工作地点或出勤安排待确认",
  "入职时间待确认",
  "关键经验不足",
  "业务优先级调整",
  "其他",
]);
export const hrDecisionHistorySchema = z.object({
  status: hrDecisionStatusSchema,
  reason: hrDecisionReasonSchema,
  note: z.string().max(1_000),
  decidedAt: z.string().datetime(),
  actor: z.literal("HR"),
});
export const hrDecisionSchema = z.object({
  status: hrDecisionStatusSchema,
  reason: hrDecisionReasonSchema,
  note: z.string().max(1_000),
  decidedAt: z.string().datetime(),
  actor: z.literal("HR"),
  history: z.array(hrDecisionHistorySchema).max(30),
});

export const storedCandidateSchema = z.object({
  id: z.string().min(1),
  sourceName: z.string().min(1),
  status: z.enum(["queued", "parsing", "matching", "complete", "error"]),
  profile: resumeProfileSchema.optional(),
  resumeText: z.string().optional(),
  match: matchResultSchema.optional(),
  interview: candidateInterviewSchema.optional(),
  hrDecision: hrDecisionSchema.optional(),
  error: z.string().optional(),
});

export const projectEventSchema = z.object({
  agent: z.string().min(1),
  action: z.string().min(1),
  detail: z.string(),
});

export const projectSnapshotSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  stage: projectStageSchema,
  job: jobAnalysisSchema.nullable(),
  candidates: z.array(storedCandidateSchema).max(10),
  selectedCandidateId: z.string().nullable(),
  resume: resumeProfileSchema.nullable(),
  resumeText: z.string().max(30_000),
  match: matchResultSchema.nullable(),
  questions: z.array(interviewQuestionSchema).max(8),
  answers: z.record(z.string(), z.string()),
  report: interviewReportSchema.nullable(),
  events: z.array(projectEventSchema).max(100),
});

export const createProjectSchema = projectSnapshotSchema.omit({ id: true });

export type ProjectStage = z.infer<typeof projectStageSchema>;
export type HrDecision = z.infer<typeof hrDecisionSchema>;
export type HrDecisionStatus = z.infer<typeof hrDecisionStatusSchema>;
export type HrDecisionReason = z.infer<typeof hrDecisionReasonSchema>;
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export interface ProjectRecord {
  id: string;
  title: string;
  stage: ProjectStage;
  snapshot: ProjectSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  stage: ProjectStage;
  candidateCount: number;
  topScore: number | null;
  recommendation: string | null;
  candidateInitials: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentAnalytics {
  metrics: {
    activeProjects: number;
    evaluatedCandidates: number;
    averageMatchScore: number;
    completedReports: number;
  };
  activeProjects: ProjectSummary[];
}
