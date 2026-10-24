import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { jobAnalysisPrompt } from "@/lib/agent/prompts";
import { modelJobAnalysisSchema, sanitizeJobAnalysis } from "@/lib/agent/schemas";

const requestSchema = z.object({
  title: z.string().trim().min(2).max(100),
  jd: z.string().trim().min(80).max(30_000),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const analysis = await generateStructured({
      ...jobAnalysisPrompt,
      schema: modelJobAnalysisSchema,
      user: `职位名称：${input.title}\n\nJD 原文：\n${input.jd}`,
    });

    return NextResponse.json({
      analysis: sanitizeJobAnalysis(analysis),
      run: {
        agent: "Job Analyst",
        action: "岗位能力模型已生成",
        sourceCharacters: input.jd.length,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
