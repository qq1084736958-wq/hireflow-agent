import { z } from "zod";

export const requirementSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  weight: z.number().min(0).max(100),
  kind: z.enum(["必备", "加分"]),
});

export const jobAnalysisSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  responsibilities: z.array(z.string().min(1)).min(1),
  requirements: z.array(requirementSchema).min(3).max(10),
  ambiguities: z.array(z.string()),
});

export const modelJobAnalysisSchema = jobAnalysisSchema.extend({
  requirements: z.array(requirementSchema).min(3).max(30),
});

export const resumeExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  period: z.string().min(1),
  highlights: z.array(z.string()).min(1),
});

export const resumeProfileSchema = z.object({
  candidateName: z.string().min(1),
  headline: z.string().min(1),
  experienceYears: z.number().min(0).max(60).nullable(),
  education: z.string(),
  location: z.string(),
  skills: z.array(z.string()),
  achievements: z.array(z.string()),
  experiences: z.array(resumeExperienceSchema),
  missingInformation: z.array(z.string()),
});

export const matchItemSchema = z.object({
  requirementId: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["已满足", "部分满足", "待验证", "不满足"]),
  score: z.number().min(0).max(100),
  evidenceQuote: z.string(),
  evidenceSource: z.string(),
  reasoning: z.string().min(1),
  interviewFocus: z.string(),
  scoreSource: z.enum(["AI评分", "HR修正"]).optional(),
  evidenceVerification: z.enum(["verified", "not_found", "no_evidence"]).optional(),
  evidenceLocation: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
  }).optional(),
});

export const modelMatchResultSchema = z.object({
  summary: z.string().min(1),
  matches: z.array(matchItemSchema).min(1),
  strengths: z.array(z.string()).min(1),
  gaps: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  recommendation: z.enum(["推荐面试", "待人工确认", "暂不推荐"]),
});

export const matchResultSchema = modelMatchResultSchema.extend({
  totalScore: z.number().min(0).max(100),
  rawScore: z.number().min(0).max(100).optional(),
  scoreCap: z.number().min(0).max(100).nullable().optional(),
  guardrailReasons: z.array(z.string()).optional(),
});

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["经历追问", "能力验证", "情景问题", "风险核验"]),
  skill: z.string().min(1),
  question: z.string().min(1),
  rationale: z.string().min(1),
  relatedRequirementId: z.string().min(1),
});

export const interviewQuestionSetSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(5).max(8),
});

export const interviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1),
});

export const interviewAnswerSetSchema = z.object({
  answers: z.array(interviewAnswerSchema).min(1).max(8),
});

export const interviewEvaluationSchema = z.object({
  questionId: z.string().min(1),
  score: z.number().min(0).max(100),
  starCompleteness: z.number().min(0).max(100),
  evidenceConsistency: z.number().min(0).max(100),
  professionalDepth: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  feedback: z.string().min(1),
});

export const modelInterviewReportSchema = z.object({
  recommendation: z.enum(["建议进入下一轮", "建议补充面试", "暂不建议推进"]),
  executiveSummary: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  followUps: z.array(z.string()),
  evaluations: z.array(interviewEvaluationSchema).min(1).max(8),
});

export const interviewReportSchema = modelInterviewReportSchema.extend({
  overallScore: z.number().min(0).max(100),
});

export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;
export type ModelJobAnalysis = z.infer<typeof modelJobAnalysisSchema>;
export type ResumeProfile = z.infer<typeof resumeProfileSchema>;
export type ModelMatchResult = z.infer<typeof modelMatchResultSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;
export type InterviewEvaluation = z.infer<typeof interviewEvaluationSchema>;
export type ModelInterviewReport = z.infer<typeof modelInterviewReportSchema>;
export type InterviewReport = z.infer<typeof interviewReportSchema>;

export function locateEvidenceQuote(resumeText: string, evidenceQuote: string) {
  const quote = evidenceQuote.trim().replace(/^[“”"'‘’]+|[“”"'‘’]+$/g, "");
  if (quote.length < 4) return null;
  const exactStart = resumeText.indexOf(quote);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + quote.length };

  const compactText: string[] = [];
  const sourceIndexes: number[] = [];
  for (let index = 0; index < resumeText.length; index += 1) {
    if (/\s/u.test(resumeText[index])) continue;
    compactText.push(resumeText[index]);
    sourceIndexes.push(index);
  }
  const compactQuote = quote.replace(/\s/gu, "");
  const compactStart = compactText.join("").indexOf(compactQuote);
  if (compactStart < 0) return null;
  return {
    start: sourceIndexes[compactStart],
    end: sourceIndexes[compactStart + compactQuote.length - 1] + 1,
  };
}

export function applyEvidenceVerification<T extends ModelMatchResult>(resumeText: string, match: T): T {
  return {
    ...match,
    matches: match.matches.map((item) => {
      const hasEvidence = item.evidenceQuote.trim().length > 0;
      const evidenceLocation = hasEvidence ? locateEvidenceQuote(resumeText, item.evidenceQuote) : null;
      if (evidenceLocation) {
        return { ...item, evidenceVerification: "verified" as const, evidenceLocation };
      }
      const evidenceVerification = hasEvidence ? "not_found" as const : "no_evidence" as const;
      return {
        ...item,
        status: "待验证" as const,
        score: Math.min(item.score, 30),
        evidenceVerification,
        evidenceLocation: undefined,
        evidenceSource: hasEvidence ? "原文未定位" : "未提供",
        reasoning: hasEvidence
          ? `程序未能在脱敏简历原文中定位该引用，不能将其作为已验证证据。${item.reasoning}`
          : `简历中没有可引用的直接证据，需要在面试中验证。${item.reasoning}`,
      };
    }),
  } as T;
}

export function normalizeRequirementWeights(job: JobAnalysis): JobAnalysis {
  const total = job.requirements.reduce((sum, requirement) => sum + requirement.weight, 0);
  if (total <= 0) {
    const evenWeight = Math.floor(100 / job.requirements.length);
    const remainder = 100 - evenWeight * job.requirements.length;
    return {
      ...job,
      requirements: job.requirements.map((item, index) => ({
        ...item,
        weight: evenWeight + (index < remainder ? 1 : 0),
      })),
    };
  }

  let assigned = 0;
  const normalized = job.requirements.map((item, index) => {
    const weight = index === job.requirements.length - 1
      ? 100 - assigned
      : Math.round((item.weight / total) * 100);
    assigned += weight;
    return { ...item, weight };
  });

  return { ...job, requirements: normalized };
}

export function sanitizeJobAnalysis(job: ModelJobAnalysis): JobAnalysis {
  const seenLabels = new Set<string>();
  const seenIds = new Set<string>();
  const requirements = job.requirements
    .filter((item) => {
      const key = item.label.toLowerCase().replace(/[\s\p{P}]/gu, "");
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    })
    .slice(0, 10)
    .map((item, index) => {
      const id = seenIds.has(item.id) ? `requirement-${index + 1}` : item.id;
      seenIds.add(id);
      return { ...item, id };
    });

  return jobAnalysisSchema.parse(normalizeRequirementWeights({ ...job, requirements }));
}

export function calculateMatchScore(job: JobAnalysis, match: ModelMatchResult) {
  const scores = new Map(match.matches.map((item) => [item.requirementId, item.score]));
  const rawScore = Math.round(job.requirements.reduce((total, requirement) => {
    return total + (scores.get(requirement.id) ?? 0) * requirement.weight / 100;
  }, 0));
  const requiredMatches = job.requirements
    .filter((requirement) => requirement.kind === "必备")
    .map((requirement) => ({
      requirement,
      match: match.matches.find((item) => item.requirementId === requirement.id),
    }));
  const failedRequired = requiredMatches.filter(({ match }) => !match || match.status === "不满足" || match.score === 0);
  const weakRequired = requiredMatches.filter(({ match }) => !match || match.score < 40);
  const hallucinatedEvidence = match.matches.filter((item) => item.evidenceVerification === "not_found");
  const hallucinatedRequired = requiredMatches.filter(({ match }) => match?.evidenceVerification === "not_found");
  const guardrailReasons: string[] = [];
  let scoreCap: number | null = null;

  if (failedRequired.length > 0) {
    scoreCap = 60;
    guardrailReasons.push(`必备项未通过：${failedRequired.map(({ requirement }) => requirement.label).join("、")}`);
  } else if (weakRequired.length >= 2) {
    scoreCap = 60;
    guardrailReasons.push(`存在 ${weakRequired.length} 项低于 40 分的必备能力`);
  }
  if (hallucinatedRequired.length > 0) {
    scoreCap = Math.min(scoreCap ?? 50, 50);
    guardrailReasons.push(`必备项引用无法在简历原文定位：${hallucinatedRequired.map(({ requirement }) => requirement.label).join("、")}`);
  } else if (hallucinatedEvidence.length > 0) {
    scoreCap = Math.min(scoreCap ?? 70, 70);
    guardrailReasons.push(`存在 ${hallucinatedEvidence.length} 项无法定位的 AI 引用`);
  }

  return {
    rawScore,
    scoreCap,
    guardrailReasons,
    totalScore: scoreCap === null ? rawScore : Math.min(rawScore, scoreCap),
  };
}

export function calculateMatchTotal(job: JobAnalysis, match: ModelMatchResult) {
  return calculateMatchScore(job, match).totalScore;
}

export function recalculateMatchResult(job: JobAnalysis, match: MatchResult): MatchResult {
  const score = calculateMatchScore(job, match);
  return {
    ...match,
    ...score,
    recommendation: score.guardrailReasons.length > 0 ? "待人工确认" : match.recommendation,
  };
}

export function calculateInterviewTotal(report: ModelInterviewReport) {
  if (report.evaluations.length === 0) return 0;
  return Math.round(
    report.evaluations.reduce((total, item) => total + item.score, 0)
      / report.evaluations.length,
  );
}
