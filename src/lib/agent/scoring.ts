import type { DimensionScore, Requirement } from "../types";

export function calculateWeightedScore(scores: DimensionScore[], rubric: Requirement[]) {
  const weights = new Map(rubric.map((item) => [item.label, item.weight]));
  const weighted = scores.reduce((total, item) => {
    return total + item.score * (weights.get(item.label) ?? 0);
  }, 0);

  const totalWeight = rubric.reduce((total, item) => total + item.weight, 0);
  return totalWeight === 0 ? 0 : Math.round(weighted / totalWeight);
}

export function weightsAreValid(rubric: Requirement[]) {
  return rubric.reduce((total, item) => total + item.weight, 0) === 100;
}
