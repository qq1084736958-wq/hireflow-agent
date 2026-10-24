import { NextResponse } from "next/server";
import { DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, getModelDeploymentMode, isModelConfigured } from "@/lib/agent/model-client";

export async function GET() {
  return NextResponse.json({
    configured: isModelConfigured(),
    provider: (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).includes("deepseek.com") ? "DeepSeek" : "OpenAI-compatible",
    deploymentMode: getModelDeploymentMode(),
    privacyMode: "server-redaction",
    model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
  });
}
