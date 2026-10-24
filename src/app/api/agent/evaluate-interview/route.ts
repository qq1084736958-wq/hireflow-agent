import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { interviewEvaluationPrompt } from "@/lib/agent/prompts";
import {
  calculateInterviewTotal,
  interviewAnswerSchema,
  interviewQuestionSchema,
  jobAnalysisSchema,
  matchResultSchema,
  modelInterviewReportSchema,
  resumeProfileSchema,
} from "@/lib/agent/schemas";

const requestSchema = z.object({
  job: jobAnalysisSchema,
  resume: resumeProfileSchema,
  match: matchResultSchema,
  questions: z.array(interviewQuestionSchema).min(1).max(8),
  answers: z.array(interviewAnswerSchema).min(1).max(8),
  answerSources: z.record(z.string(), z.enum(["manual", "simulated"])),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const questionIds = new Set(input.questions.map((item) => item.id));
    const answerIds = new Set(input.answers.map((item) => item.questionId));
    if (questionIds.size !== answerIds.size || [...questionIds].some((id) => !answerIds.has(id))) {
      throw new Error("请完成全部面试题后再生成报告。");
    }
    const sourceIds = new Set(Object.keys(input.answerSources));
    if ([...questionIds].some((id) => !sourceIds.has(id))) {
      throw new Error("请确认每道回答的来源后再生成报告。");
    }
    const sourceValues = [...questionIds].map((id) => input.answerSources[id]);
    const evaluationMode = sourceValues.every((source) => source === "simulated")
      ? "simulation"
      : sourceValues.every((source) => source === "manual")
        ? "real"
        : "mixed";

    const responseSchema = modelInterviewReportSchema.superRefine((value, context) => {
      const evaluationIds = new Set(value.evaluations.map((item) => item.questionId));
      if (evaluationIds.size !== questionIds.size || [...questionIds].some((id) => !evaluationIds.has(id))) {
        context.addIssue({ code: "custom", message: "必须逐题生成评估结果" });
      }
    });
    const modelReport = await generateStructured({
      ...interviewEvaluationPrompt,
      schema: responseSchema,
      user: `岗位能力模型：\n${JSON.stringify(input.job, null, 2)}\n\n候选人简历摘要：\n${JSON.stringify(input.resume, null, 2)}\n\n人岗匹配结果：\n${JSON.stringify(input.match, null, 2)}\n\n面试问题：\n${JSON.stringify(input.questions, null, 2)}\n\n候选人回答：\n${JSON.stringify(input.answers, null, 2)}\n\n回答来源（manual 为 HR 记录的真实回答，simulated 为作品集演示数据）：\n${JSON.stringify(input.answerSources, null, 2)}\n\n重要：simulated 回答只能生成演示性评估，不得描述为真实候选人面试结论。`,
    });
    const overallScore = calculateInterviewTotal(modelReport);

    return NextResponse.json({
      report: { ...modelReport, overallScore },
      run: {
        agent: "Interview Evaluator",
        action: evaluationMode === "real" ? "真实回答逐题评分与面试报告生成完成" : evaluationMode === "simulation" ? "模拟回答演示评分完成" : "混合来源回答评分完成",
        evaluatedAnswers: modelReport.evaluations.length,
        evaluationMode,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
