import { NextResponse } from "next/server";
import { projectApiError } from "@/lib/projects/api-error";
import { createJobDraft, jobDraftContentSchema, listJobDrafts } from "@/lib/projects/job-drafts";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ drafts: listJobDrafts() });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const content = jobDraftContentSchema.parse(await request.json());
    return NextResponse.json({ draft: createJobDraft(content) }, { status: 201 });
  } catch (error) {
    return projectApiError(error);
  }
}

