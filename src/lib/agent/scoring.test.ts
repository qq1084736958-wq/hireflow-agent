import { describe, expect, it } from "vitest";
import { requirements } from "../demo-data";
import { calculateWeightedScore, weightsAreValid } from "./scoring";

describe("candidate scoring", () => {
  it("calculates the total in application code", () => {
    const score = calculateWeightedScore(
      [
        { label: "AI 产品落地", score: 92 },
        { label: "产品全流程", score: 90 },
        { label: "业务成果", score: 91 },
        { label: "跨团队协作", score: 86 },
        { label: "企业服务经验", score: 70 },
      ],
      requirements,
    );

    expect(score).toBe(88);
  });

  it("accepts only a 100 percent rubric", () => {
    expect(weightsAreValid(requirements)).toBe(true);
    expect(weightsAreValid(requirements.slice(1))).toBe(false);
  });
});
