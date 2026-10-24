import { describe, expect, it } from "vitest";
import { jobDraftContentSchema } from "./job-drafts";

describe("job drafts", () => {
  it("accepts incomplete JD content so users can save work early", () => {
    expect(jobDraftContentSchema.safeParse({ title: "客户成功经理", jd: "负责客户续约" }).success).toBe(true);
  });

  it("rejects content beyond the JD input limit", () => {
    expect(jobDraftContentSchema.safeParse({ title: "客户成功经理", jd: "字".repeat(30_001) }).success).toBe(false);
  });
});

