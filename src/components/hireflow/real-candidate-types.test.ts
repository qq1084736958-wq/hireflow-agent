import { describe, expect, it } from "vitest";
import {
  findNextInterviewCandidate,
  getInterviewProgress,
  sortCompletedCandidates,
  type CandidateRun,
} from "./real-candidate-types";

function completed(id: string, score: number) {
  return {
    id,
    status: "complete",
    profile: { candidateName: id },
    resumeText: "resume text",
    match: { totalScore: score },
  } as CandidateRun;
}

describe("candidate ranking", () => {
  it("keeps only completed candidates and sorts by total score", () => {
    const failed = { id: "failed", status: "error" } as CandidateRun;
    const ranked = sortCompletedCandidates([
      completed("candidate-b", 76),
      failed,
      completed("candidate-a", 91),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["candidate-a", "candidate-b"]);
  });

  it("continues with the next unfinished candidate and wraps around", () => {
    const first = completed("candidate-a", 91);
    first.interview = { status: "completed", questions: [], answers: {}, report: null };
    const second = completed("candidate-b", 84);
    const third = completed("candidate-c", 76);
    third.interview = { status: "completed", questions: [], answers: {}, report: null };

    expect(findNextInterviewCandidate([third, second, first], "candidate-a")?.id).toBe("candidate-b");
    expect(findNextInterviewCandidate([third, second, first], "candidate-c")?.id).toBe("candidate-b");
  });

  it("reports completion and stops the loop when everyone is done", () => {
    const first = completed("candidate-a", 91);
    const second = completed("candidate-b", 84);
    first.interview = { status: "completed", questions: [], answers: {}, report: null };
    second.interview = { status: "completed", questions: [], answers: {}, report: null };

    expect(getInterviewProgress([first, second])).toEqual({ completed: 2, inProgress: 0, total: 2 });
    expect(findNextInterviewCandidate([first, second], "candidate-a")).toBeNull();
  });
});
