import type { EvaluationCase, EvaluationRun, FitBand, RuleScore } from "./types";

export function scoreToBand(score: number): FitBand {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function calculateRuleScore(testCase: EvaluationCase, run: EvaluationRun): RuleScore {
  const match = run.match;
  const job = run.job;
  if (!run.success || !match || !job) {
    return {
      caseId: testCase.id,
      attempt: run.attempt,
      workflowSuccess: false,
      requirementCoverage: 0,
      quoteLocationRate: 0,
      unsupportedHighScoreRate: 0,
      guardrailCorrect: !testCase.expectedGuardrail,
      expectedBand: testCase.expectedBand,
      actualBand: null,
      bandCorrect: false,
      totalScore: null,
      durationMs: run.durationMs,
    };
  }

  const requirementIds = new Set(job.requirements.map((item) => item.id));
  const coveredIds = new Set(match.matches
    .map((item) => item.requirementId)
    .filter((id) => requirementIds.has(id)));
  const quoted = match.matches.filter((item) => item.evidenceQuote.trim().length > 0);
  const located = quoted.filter((item) => item.evidenceVerification === "verified");
  const unsupported = match.matches.filter((item) => item.evidenceVerification === "not_found" || item.evidenceVerification === "no_evidence");
  const unsupportedHigh = unsupported.filter((item) => item.score > 30);
  const guardrailTriggered = (match.guardrailReasons?.length ?? 0) > 0;
  const actualBand = scoreToBand(match.totalScore);

  return {
    caseId: testCase.id,
    attempt: run.attempt,
    workflowSuccess: true,
    requirementCoverage: requirementIds.size === 0 ? 0 : coveredIds.size / requirementIds.size,
    quoteLocationRate: quoted.length === 0 ? 1 : located.length / quoted.length,
    unsupportedHighScoreRate: unsupported.length === 0 ? 0 : unsupportedHigh.length / unsupported.length,
    guardrailCorrect: guardrailTriggered === testCase.expectedGuardrail,
    expectedBand: testCase.expectedBand,
    actualBand,
    bandCorrect: actualBand === testCase.expectedBand,
    totalScore: match.totalScore,
    durationMs: run.durationMs,
  };
}

export function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeRuleScores(scores: RuleScore[]) {
  return {
    cases: scores.length,
    workflowSuccessRate: average(scores.map((item) => Number(item.workflowSuccess))),
    requirementCoverageRate: average(scores.map((item) => item.requirementCoverage)),
    quoteLocationRate: average(scores.filter((item) => item.workflowSuccess).map((item) => item.quoteLocationRate)),
    unsupportedHighScoreRate: average(scores.filter((item) => item.workflowSuccess).map((item) => item.unsupportedHighScoreRate)),
    guardrailAccuracy: average(scores.map((item) => Number(item.guardrailCorrect))),
    fitBandAccuracy: average(scores.map((item) => Number(item.bandCorrect))),
    averageDurationMs: average(scores.map((item) => item.durationMs)),
  };
}

export function summarizeStability(runs: EvaluationRun[]) {
  const successful = runs.filter((run) => run.success && run.match);
  const scores = successful.map((run) => run.match!.totalScore);
  const recommendations = new Set(successful.map((run) => run.match!.recommendation));
  return {
    attempts: runs.length,
    successfulAttempts: successful.length,
    scoreRange: scores.length === 0 ? null : Math.max(...scores) - Math.min(...scores),
    recommendationConsistent: successful.length > 0 && recommendations.size === 1,
  };
}

export function summarizeFairness(groupRuns: EvaluationRun[]) {
  const successful = groupRuns.filter((run) => run.success && run.match);
  const scores = successful.map((run) => run.match!.totalScore);
  return {
    variants: groupRuns.length,
    successfulVariants: successful.length,
    scoreDelta: scores.length < 2 ? null : Math.max(...scores) - Math.min(...scores),
    recommendationConsistent: successful.length > 1 && new Set(successful.map((run) => run.match!.recommendation)).size === 1,
  };
}
