import { describe, expect, it } from "vitest";
import { hasPermission, projectCandidateForRole } from "./access-control";

const candidate = {
  name: "林悦",
  headline: "AI 产品负责人",
  phone: "13812345678",
  email: "lin.yue@example.com",
  matchScore: 87,
  resumeSummary: "8 年产品经验",
  resumeOriginal: "完整简历原文",
};

describe("role based access control", () => {
  it("lets a department manager see the score but masks contact fields", () => {
    const projected = projectCandidateForRole("department_manager", candidate);
    expect(projected.matchScore).toBe(87);
    expect(projected.phone).toBe("138 •••• 5678");
    expect(projected.email).toBe("l•••@example.com");
    expect(projected.resumeOriginal).toBeNull();
  });

  it("does not expose score or contact details to interviewers", () => {
    const projected = projectCandidateForRole("interviewer", candidate);
    expect(projected.matchScore).toBeNull();
    expect(projected.phone).not.toBe(candidate.phone);
    expect(hasPermission("interviewer", "candidate:decision")).toBe(false);
  });

  it("gives HRBP the operational fields required for recruitment", () => {
    const projected = projectCandidateForRole("hrbp", candidate);
    expect(projected.phone).toBe(candidate.phone);
    expect(projected.resumeOriginal).toBe(candidate.resumeOriginal);
    expect(hasPermission("hrbp", "candidate:decision")).toBe(true);
  });
});
