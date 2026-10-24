import { NextResponse } from "next/server";
import { projectApiError } from "@/lib/projects/api-error";
import { deleteJobDraft, jobDraftContentSchema, updateJobDraft } from "@/lib/projects/job-drafts";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const content = jobDraftContentSchema.parse(await request.json());
    const draft = updateJobDraft(id, content);
    return draft ? NextResponse.json({ draft }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "职位草稿不存在。" } }, { status: 404 });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteJobDraft(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return projectApiError(error);
  }
}

