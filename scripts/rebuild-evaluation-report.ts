import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluationCases } from "../eval/cases";
import { calculateRuleScore } from "../src/lib/evaluation/metrics";
import { buildEvaluationReport, buildResultsCsv } from "../src/lib/evaluation/report";
import { evaluationRunSchema } from "../src/lib/evaluation/types";

async function main() {
  const outputDirectory = path.resolve("output/evaluation");
  const resultsPath = path.join(outputDirectory, "evaluation-results.json");
  const existing = JSON.parse(await readFile(resultsPath, "utf8"));
  const runs = evaluationRunSchema.array().parse(existing.runs);
  const scores = runs.map((run) => {
    const testCase = evaluationCases.find((item) => item.id === run.caseId);
    if (!testCase) throw new Error(`Unknown evaluation case: ${run.caseId}`);
    return calculateRuleScore(testCase, run);
  });
  const generatedAt = new Date().toISOString();
  const report = buildEvaluationReport({
    generatedAt,
    model: existing.model,
    cases: evaluationCases,
    runs,
    scores,
  });
  const results = {
    ...existing,
    generatedAt,
    cases: evaluationCases,
    scores,
    summary: report.summary,
    judgeSummary: report.judgeSummary,
    stability: report.stability,
    fairness: report.fairness,
  };

  await Promise.all([
    writeFile(resultsPath, JSON.stringify(results, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-cases.json"), JSON.stringify(evaluationCases, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-results.csv"), buildResultsCsv(evaluationCases, runs, scores), "utf8"),
    writeFile(path.join(outputDirectory, "badcases.json"), JSON.stringify(report.badcases, null, 2), "utf8"),
    writeFile(path.join(outputDirectory, "evaluation-report.md"), report.markdown, "utf8"),
  ]);

  console.log(`Report rebuilt from ${runs.length} existing runs.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
