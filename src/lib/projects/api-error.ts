import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function projectApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "项目数据格式不正确。", details: error.flatten() } }, { status: 400 });
  }
  console.error("Project API error", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "项目保存失败，请稍后重试。" } }, { status: 500 });
}
