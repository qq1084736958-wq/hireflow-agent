import { NextResponse } from "next/server";
import { trainingRecordApiError } from "@/lib/training/api-error";
import { createTrainingRecord, listTrainingRecords } from "@/lib/training/database";
import { createTrainingRecordSchema, trainingRecordSnapshotSchema } from "@/lib/training/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 10));
    return NextResponse.json(listTrainingRecords(page, pageSize));
  } catch (error) {
    return trainingRecordApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createTrainingRecordSchema.parse(await request.json());
    const snapshot = trainingRecordSnapshotSchema.parse({ ...input, id: crypto.randomUUID() });
    return NextResponse.json({ record: createTrainingRecord(snapshot) }, { status: 201 });
  } catch (error) {
    return trainingRecordApiError(error);
  }
}
