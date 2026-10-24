import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import {
  getResumeBatch,
  retryResumeBatchItem,
} from "@/lib/agent/resume-batch-database";
import { startResumeBatch } from "@/lib/agent/resume-batch-worker";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }
const retrySchema = z.object({ itemId: z.string().uuid() });

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const batch = getResumeBatch(id);
    if (!batch) return NextResponse.json({ error: "批处理任务不存在。" }, { status: 404 });
    startResumeBatch(id);
    return NextResponse.json({ batch });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { itemId } = retrySchema.parse(await request.json());
    const retried = retryResumeBatchItem(id, itemId);
    if (!retried) return NextResponse.json({ error: "该任务当前不可重试。" }, { status: 409 });
    startResumeBatch(id);
    return NextResponse.json({ batch: getResumeBatch(id) });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

