import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { generateStructured } from "@/lib/agent/model-client";
import { roleplayPrompt } from "@/lib/training/prompts";
import { roleplayReplySchema, trainingMessageSchema, trainingPlanSchema } from "@/lib/training/schemas";

const requestSchema = z.object({ plan: trainingPlanSchema, messages: z.array(trainingMessageSchema).min(1).max(20) });

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await generateStructured({ ...roleplayPrompt, schema: roleplayReplySchema, user: `陪练场景：\n${JSON.stringify(input.plan.scenario, null, 2)}\n\n当前对话：\n${JSON.stringify(input.messages, null, 2)}` });
    return NextResponse.json({ ...result, run: { agent: "Roleplay Partner", action: "角色回应生成完成", turns: input.messages.length } });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
