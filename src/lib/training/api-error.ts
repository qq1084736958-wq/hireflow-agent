import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function trainingRecordApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "培训记录数据格式不正确。", details: error.flatten() } }, { status: 400 });
  }
  console.error("Training record API error", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "培训记录保存失败，请稍后重试。" } }, { status: 500 });
}
