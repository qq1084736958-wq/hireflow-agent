import { z } from "zod";

export const accessRoleSchema = z.enum(["department_manager", "hrbp", "interviewer"]);
export type AccessRole = z.infer<typeof accessRoleSchema>;

export const permissionSchema = z.enum([
  "job:edit",
  "candidate:summary",
  "candidate:resume_original",
  "candidate:contact",
  "candidate:match_score",
  "candidate:decision",
  "interview:record",
  "report:export",
]);
export type Permission = z.infer<typeof permissionSchema>;

export const rolePolicies: Record<AccessRole, {
  label: string;
  description: string;
  permissions: Permission[];
}> = {
  department_manager: {
    label: "用人部门主管",
    description: "参与岗位确认和业务决策，但不接触候选人联系方式与完整简历。",
    permissions: [
      "job:edit",
      "candidate:summary",
      "candidate:match_score",
      "candidate:decision",
      "report:export",
    ],
  },
  hrbp: {
    label: "HRBP",
    description: "负责招聘流程管理，可在业务必要范围内查看候选人资料。",
    permissions: [
      "job:edit",
      "candidate:summary",
      "candidate:resume_original",
      "candidate:contact",
      "candidate:match_score",
      "candidate:decision",
      "interview:record",
      "report:export",
    ],
  },
  interviewer: {
    label: "面试官",
    description: "仅查看被分配候选人的面试必要信息，不查看联系方式、排名和最终决策。",
    permissions: [
      "candidate:summary",
      "interview:record",
    ],
  },
};

export function hasPermission(role: AccessRole, permission: Permission) {
  return rolePolicies[role].permissions.includes(permission);
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "••••••••";
  return `${digits.slice(0, 3)} •••• ${digits.slice(-4)}`;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••••@••••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

export function projectCandidateForRole(role: AccessRole, candidate: {
  name: string;
  headline: string;
  phone: string;
  email: string;
  matchScore: number;
  resumeSummary: string;
  resumeOriginal: string;
}) {
  return {
    name: candidate.name,
    headline: candidate.headline,
    phone: hasPermission(role, "candidate:contact") ? candidate.phone : maskPhone(candidate.phone),
    email: hasPermission(role, "candidate:contact") ? candidate.email : maskEmail(candidate.email),
    matchScore: hasPermission(role, "candidate:match_score") ? candidate.matchScore : null,
    resumeSummary: hasPermission(role, "candidate:summary") ? candidate.resumeSummary : null,
    resumeOriginal: hasPermission(role, "candidate:resume_original") ? candidate.resumeOriginal : null,
  };
}
