import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { trainingEvaluationPrompt } from "@/lib/training/prompts";
import { applyTrainingEvidenceGuardrails, modelTrainingReportSchema, trainingMessageSchema, trainingPlanSchema } from "@/lib/training/schemas";

const requestSchema = z.object({ plan: trainingPlanSchema, messages: z.array(trainingMessageSchema).min(2).max(20) });

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const learnerTurns = input.messages.filter((item) => item.role === "learner").length;
    const report = await generateStructured({ ...trainingEvaluationPrompt, schema: modelTrainingReportSchema, user: `培训目标与评分标准：\n${JSON.stringify({ objective: input.plan.objective, criteria: input.plan.scenario.evaluationCriteria }, null, 2)}\n\n完整对话：\n${JSON.stringify(input.messages, null, 2)}` });
    const guardedReport = applyTrainingEvidenceGuardrails(report, learnerTurns);
    return NextResponse.json({ report: guardedReport, run: { agent: "Practice Evaluator", action: "行为证据评分与培训报告生成完成", evaluatedTurns: learnerTurns } });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
