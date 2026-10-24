import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { matchPrompt } from "@/lib/agent/prompts";
import {
  applyEvidenceVerification,
  calculateMatchScore,
  jobAnalysisSchema,
  modelMatchResultSchema,
  resumeProfileSchema,
} from "@/lib/agent/schemas";

const requestSchema = z.object({
  job: jobAnalysisSchema,
  resume: resumeProfileSchema,
  resumeText: z.string().min(80).max(30_000),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const modelResult = await generateStructured({
      ...matchPrompt,
      schema: modelMatchResultSchema,
      user: `岗位能力模型：\n${JSON.stringify(input.job, null, 2)}\n\n结构化简历：\n${JSON.stringify(input.resume, null, 2)}\n\n简历原文（证据只能引用此处）：\n${input.resumeText}`,
    });
    const verifiedResult = applyEvidenceVerification(input.resumeText, modelResult);
    const score = calculateMatchScore(input.job, verifiedResult);

    return NextResponse.json({
      result: {
        ...verifiedResult,
        recommendation: score.guardrailReasons.length > 0 ? "待人工确认" : verifiedResult.recommendation,
        matches: verifiedResult.matches.map((item) => ({ ...item, scoreSource: "AI评分" as const })),
        ...score,
      },
      run: {
        agent: "Match Evaluator",
        action: "证据映射与程序评分完成",
        evaluatedRequirements: input.job.requirements.length,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
