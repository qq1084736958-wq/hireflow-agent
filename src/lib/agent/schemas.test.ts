import { describe, expect, it } from "vitest";
import { interviewAnswerSchema } from "./schemas";

describe("interview answer schema", () => {
  it("accepts a short but non-empty real answer", () => {
    expect(interviewAnswerSchema.parse({ questionId: "q1", answer: "没有做过" }).answer).toBe("没有做过");
  });

  it("rejects an empty answer", () => {
    expect(interviewAnswerSchema.safeParse({ questionId: "q1", answer: "   " }).success).toBe(false);
  });
});
