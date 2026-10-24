import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { interviewSimulationPrompt } from "@/lib/agent/prompts";
import {
  interviewAnswerSetSchema,
  interviewQuestionSchema,
  resumeProfileSchema,
} from "@/lib/agent/schemas";

const requestSchema = z.object({
  resume: resumeProfileSchema,
  resumeText: z.string().min(80).max(30_000),
  questions: z.array(interviewQuestionSchema).min(1).max(8),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const questionIds = new Set(input.questions.map((item) => item.id));
    const responseSchema = interviewAnswerSetSchema.superRefine((value, context) => {
      const answerIds = new Set(value.answers.map((item) => item.questionId));
      if (answerIds.size !== input.questions.length || [...questionIds].some((id) => !answerIds.has(id))) {
        context.addIssue({ code: "custom", message: "必须为每道面试题生成且只生成一个回答" });
      }
    });
    const result = await generateStructured({
      ...interviewSimulationPrompt,
      schema: responseSchema,
      user: `结构化简历：\n${JSON.stringify(input.resume, null, 2)}\n\n简历原文（唯一事实来源）：\n${input.resumeText}\n\n需要逐题回答的问题：\n${JSON.stringify(input.questions, null, 2)}`,
    });

    return NextResponse.json({
      answers: result.answers,
      run: {
        agent: "Candidate Simulator",
        action: "候选人模拟回答生成完成",
        answeredQuestions: result.answers.length,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
