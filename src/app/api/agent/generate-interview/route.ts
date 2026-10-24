import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { interviewQuestionPrompt } from "@/lib/agent/prompts";
import {
  interviewQuestionSetSchema,
  jobAnalysisSchema,
  matchResultSchema,
  resumeProfileSchema,
} from "@/lib/agent/schemas";

const requestSchema = z.object({
  job: jobAnalysisSchema,
  resume: resumeProfileSchema,
  match: matchResultSchema,
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await generateStructured({
      ...interviewQuestionPrompt,
      schema: interviewQuestionSetSchema,
      user: `岗位能力模型：\n${JSON.stringify(input.job, null, 2)}\n\n候选人简历摘要：\n${JSON.stringify(input.resume, null, 2)}\n\n人岗匹配结果：\n${JSON.stringify(input.match, null, 2)}`,
    });
    const requirementIds = new Set(input.job.requirements.map((item) => item.id));
    const fallbackId = input.job.requirements[0].id;
    const questions = result.questions.map((item, index) => ({
      ...item,
      id: `q${index + 1}`,
      relatedRequirementId: requirementIds.has(item.relatedRequirementId)
        ? item.relatedRequirementId
        : fallbackId,
    }));

    return NextResponse.json({
      questions,
      run: {
        agent: "Interview Designer",
        action: "结构化面试题生成完成",
        generatedQuestions: questions.length,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
