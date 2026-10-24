import { NextResponse } from "next/server";
import { projectApiError } from "@/lib/projects/api-error";
import { deleteProject, getProject, updateProject } from "@/lib/projects/database";
import { projectSnapshotSchema } from "@/lib/projects/schema";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    return project ? NextResponse.json({ project }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "招聘项目不存在。" } }, { status: 404 });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const snapshot = projectSnapshotSchema.parse({ ...(await request.json()), id });
    const project = updateProject(snapshot);
    return project ? NextResponse.json({ project }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "招聘项目不存在。" } }, { status: 404 });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteProject(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return projectApiError(error);
  }
}
