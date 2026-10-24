import { NextResponse } from "next/server";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { trainingContentPrompt } from "@/lib/training/prompts";
import { trainingBriefSchema, trainingPlanSchema } from "@/lib/training/schemas";

export async function POST(request: Request) {
  try {
    const input = trainingBriefSchema.parse(await request.json());
    const plan = await generateStructured({ ...trainingContentPrompt, schema: trainingPlanSchema, user: `培训主题：${input.topic}\n培训受众：${input.audience}\n培训目标：${input.objective}\n业务情境：${input.context}` });
    return NextResponse.json({ plan, run: { agent: "Learning Designer", action: "培训内容与陪练场景生成完成", generatedModules: plan.modules.length } });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
