import { NextResponse } from "next/server";
import {
  accessRoleSchema,
  hasPermission,
  projectCandidateForRole,
  rolePolicies,
} from "@/lib/access-control";

export const runtime = "nodejs";

const demoCandidate = {
  name: "林悦",
  headline: "AI 产品负责人 · 企业 SaaS",
  phone: "13812345678",
  email: "lin.yue@example.com",
  matchScore: 87,
  resumeSummary: "8 年产品经验，具备 AI 产品从 0 到 1 和企业 SaaS 交付经历。",
  resumeOriginal: "林悦｜AI 产品负责人｜完整脱敏简历原文仅供具备权限的招聘人员查看。",
};

export async function GET(request: Request) {
  const role = accessRoleSchema.safeParse(new URL(request.url).searchParams.get("role"));
  if (!role.success) {
    return NextResponse.json(
      { error: { code: "INVALID_ROLE", message: "角色不存在。" } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    role: role.data,
    policy: rolePolicies[role.data],
    candidate: projectCandidateForRole(role.data, demoCandidate),
    allowedActions: {
      editJob: hasPermission(role.data, "job:edit"),
      makeDecision: hasPermission(role.data, "candidate:decision"),
      recordInterview: hasPermission(role.data, "interview:record"),
      exportReport: hasPermission(role.data, "report:export"),
    },
    enforcement: "server",
  });
}
