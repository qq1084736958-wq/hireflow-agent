import { describe, expect, it } from "vitest";
import { evaluationCases, interviewCaseIds, jobDefinitions, stabilityCaseIds } from "./cases";

describe("HireFlow evaluation set", () => {
  it("contains exactly thirty cases with the planned distribution", () => {
    expect(evaluationCases).toHaveLength(30);
    expect(evaluationCases.filter((item) => item.type === "regular")).toHaveLength(18);
    expect(evaluationCases.filter((item) => item.type === "edge")).toHaveLength(8);
    expect(evaluationCases.filter((item) => item.type === "fairness")).toHaveLength(4);
  });

  it("covers all three job definitions", () => {
    expect(new Set(evaluationCases.map((item) => item.jobId))).toEqual(new Set(Object.keys(jobDefinitions)));
  });

  it("uses unique case identifiers and six stability cases", () => {
    expect(new Set(evaluationCases.map((item) => item.id)).size).toBe(30);
    expect(stabilityCaseIds).toHaveLength(6);
    expect(stabilityCaseIds.every((id) => evaluationCases.some((item) => item.id === id))).toBe(true);
    expect(interviewCaseIds).toHaveLength(6);
    expect(interviewCaseIds.every((id) => evaluationCases.some((item) => item.id === id))).toBe(true);
  });

  it("creates two complete fairness pairs", () => {
    const groups = Map.groupBy(evaluationCases.filter((item) => item.type === "fairness"), (item) => item.fairnessGroup);
    expect(groups.size).toBe(2);
    expect([...groups.values()].every((items) => items.length === 2)).toBe(true);
  });
});
