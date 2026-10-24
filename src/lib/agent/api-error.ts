import { NextResponse } from "next/server";
import { AgentConfigurationError, AgentModelError } from "./model-client";

export function agentErrorResponse(error: unknown) {
  if (error instanceof AgentConfigurationError) {
    return NextResponse.json({ error: error.message, code: "MODEL_NOT_CONFIGURED" }, { status: 503 });
  }
  if (error instanceof AgentModelError) {
    return NextResponse.json({ error: error.message, code: "MODEL_REQUEST_FAILED" }, { status: 502 });
  }
  return NextResponse.json({
    error: error instanceof Error ? error.message : "Agent 执行失败。",
    code: "AGENT_FAILED",
  }, { status: 400 });
}
