import { NextResponse } from "next/server";
import { trainingRecordApiError } from "@/lib/training/api-error";
import { deleteTrainingRecord, getTrainingRecord } from "@/lib/training/database";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = getTrainingRecord(id);
    return record
      ? NextResponse.json({ record })
      : NextResponse.json({ error: { code: "NOT_FOUND", message: "培训记录不存在。" } }, { status: 404 });
  } catch (error) {
    return trainingRecordApiError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteTrainingRecord(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return trainingRecordApiError(error);
  }
}
