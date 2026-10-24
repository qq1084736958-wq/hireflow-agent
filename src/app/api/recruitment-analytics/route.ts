import { NextResponse } from "next/server";
import { calculateRecruitmentAnalytics } from "@/lib/projects/analytics";
import { projectApiError } from "@/lib/projects/api-error";
import { getAllProjects } from "@/lib/projects/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ analytics: calculateRecruitmentAnalytics(getAllProjects()) });
  } catch (error) {
    return projectApiError(error);
  }
}
