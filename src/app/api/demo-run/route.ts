import { NextResponse } from "next/server";
import { agentEvents, candidates, demoJob, interviewQuestions, requirements } from "@/lib/demo-data";

export async function POST() {
  return NextResponse.json({
    runId: `demo-${Date.now()}`,
    job: demoJob,
    requirements,
    candidates,
    questions: interviewQuestions,
    events: agentEvents,
  });
}
