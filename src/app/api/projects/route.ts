import { NextResponse } from "next/server";
import { projectApiError } from "@/lib/projects/api-error";
import { createProject, listProjects } from "@/lib/projects/database";
import { createProjectSchema, projectSnapshotSchema } from "@/lib/projects/schema";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 10));
    return NextResponse.json(listProjects(page, pageSize));
  } catch (error) {
    return projectApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createProjectSchema.parse(await request.json());
    const snapshot = projectSnapshotSchema.parse({ ...input, id: crypto.randomUUID() });
    return NextResponse.json({ project: createProject(snapshot) }, { status: 201 });
  } catch (error) {
    return projectApiError(error);
  }
}
