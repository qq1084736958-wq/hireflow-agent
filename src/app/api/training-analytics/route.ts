import { NextResponse } from "next/server";
import { z } from "zod";
import { trainingRecordApiError } from "@/lib/training/api-error";
import { calculateTrainingAnalytics } from "@/lib/training/analytics";
import { getAllTrainingRecords } from "@/lib/training/database";

export const runtime = "nodejs";

const filterSchema = z.object({
  topic: z.string().max(200).optional(),
  recommendation: z.enum(["通过", "建议再次练习", "需要辅导"]).optional(),
  days: z.coerce.number().int().positive().max(3650).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = filterSchema.parse({
      topic: url.searchParams.get("topic") || undefined,
      recommendation: url.searchParams.get("recommendation") || undefined,
      days: url.searchParams.get("days") || undefined,
    });
    return NextResponse.json({ analytics: calculateTrainingAnalytics(getAllTrainingRecords(), filters) });
  } catch (error) {
    return trainingRecordApiError(error);
  }
}
