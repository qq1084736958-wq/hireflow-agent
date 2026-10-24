import type { TrainingAnalytics, TrainingRecord } from "./schemas";

export interface TrainingAnalyticsFilters {
  topic?: string;
  recommendation?: string;
  days?: number;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export function calculateTrainingAnalytics(records: TrainingRecord[], filters: TrainingAnalyticsFilters = {}, now = new Date()): TrainingAnalytics {
  const availableTopics = [...new Set(records.map((record) => record.snapshot.brief.topic))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  const cutoff = filters.days ? new Date(now.getTime() - filters.days * 86_400_000) : null;
  const filtered = records.filter((record) => {
    if (filters.topic && record.snapshot.brief.topic !== filters.topic) return false;
    if (filters.recommendation && record.snapshot.report.recommendation !== filters.recommendation) return false;
    if (cutoff && new Date(record.createdAt) < cutoff) return false;
    return true;
  });

  const scores = filtered.map((record) => record.snapshot.report.overallScore);
  const learnerNames = new Set(filtered.map((record) => record.snapshot.brief.traineeName));
  const passed = filtered.filter((record) => record.snapshot.report.recommendation === "通过").length;
  const turns = filtered.map((record) => record.snapshot.messages.filter((message) => message.role === "learner").length);

  const dimensionMap = new Map<string, number[]>();
  const learnerMap = new Map<string, TrainingRecord[]>();
  const topicMap = new Map<string, TrainingRecord[]>();
  const trendMap = new Map<string, TrainingRecord[]>();

  for (const record of filtered) {
    for (const dimension of record.snapshot.report.dimensions) {
      dimensionMap.set(dimension.label, [...(dimensionMap.get(dimension.label) ?? []), dimension.score]);
    }
    const learner = record.snapshot.brief.traineeName;
    learnerMap.set(learner, [...(learnerMap.get(learner) ?? []), record]);
    const topic = record.snapshot.brief.topic;
    topicMap.set(topic, [...(topicMap.get(topic) ?? []), record]);
    const date = record.createdAt.slice(0, 10);
    trendMap.set(date, [...(trendMap.get(date) ?? []), record]);
  }

  return {
    metrics: {
      totalCompletions: filtered.length,
      uniqueLearners: learnerNames.size,
      averageScore: average(scores),
      passRate: filtered.length ? Math.round((passed / filtered.length) * 100) : 0,
      averageTurns: average(turns),
    },
    dimensionAverages: [...dimensionMap.entries()]
      .map(([label, values]) => ({ label, averageScore: average(values), sampleSize: values.length }))
      .sort((left, right) => left.averageScore - right.averageScore),
    learners: [...learnerMap.entries()]
      .map(([traineeName, attempts]) => {
        const latest = [...attempts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
        const attemptScores = attempts.map((record) => record.snapshot.report.overallScore);
        return { traineeName, attempts: attempts.length, averageScore: average(attemptScores), bestScore: Math.max(...attemptScores), latestAt: latest.updatedAt, latestRecordId: latest.id };
      })
      .sort((left, right) => right.averageScore - left.averageScore),
    topics: [...topicMap.entries()]
      .map(([topic, attempts]) => ({ topic, attempts: attempts.length, averageScore: average(attempts.map((record) => record.snapshot.report.overallScore)) }))
      .sort((left, right) => right.attempts - left.attempts || right.averageScore - left.averageScore),
    trend: [...trendMap.entries()]
      .map(([date, attempts]) => ({ date, attempts: attempts.length, averageScore: average(attempts.map((record) => record.snapshot.report.overallScore)) }))
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-12),
    availableTopics,
  };
}
