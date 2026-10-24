"use client";

import { useState } from "react";
import type { Candidate, Stage } from "@/lib/types";
import type { ProjectSnapshot } from "@/lib/projects/schema";
import type { JobDraft } from "@/lib/projects/job-drafts";
import type { TrainingRecordSnapshot } from "@/lib/training/schemas";
import { candidates } from "@/lib/demo-data";
import { AgentDrawer } from "./agent-drawer";
import { Dashboard } from "./dashboard";
import { RealAgentFlow } from "./real-agent-flow";
import { JobsPage } from "./jobs-page";
import { Sidebar } from "./sidebar";
import { Workspace } from "./workspace";
import { TrainingAgentFlow } from "../training/training-agent-flow";
import { TrainingDashboard } from "../training/training-dashboard";
import { AccessControlPage } from "./access-control-page";
import type { AccessRole } from "@/lib/access-control";

export function HireFlowApp() {
  const [view, setView] = useState<"dashboard" | "jobs" | "demo" | "real" | "training" | "training-dashboard" | "access">("dashboard");
  const [accessRole, setAccessRole] = useState<AccessRole>("department_manager");
  const [stage, setStage] = useState<Stage>("requirements");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate>(candidates[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [restoredProject, setRestoredProject] = useState<ProjectSnapshot | undefined>();
  const [restoredDraft, setRestoredDraft] = useState<JobDraft | undefined>();
  const [restoredTraining, setRestoredTraining] = useState<TrainingRecordSnapshot | undefined>();

  async function startDemo() {
    setIsStarting(true);
    try {
      await fetch("/api/demo-run", { method: "POST" });
      setView("demo");
      setStage("requirements");
    } finally {
      setIsStarting(false);
    }
  }

  function openCandidate(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setStage("candidates");
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={view === "dashboard" ? "dashboard" : view === "training" ? "training" : view === "training-dashboard" ? "training-dashboard" : view === "access" ? "access" : "jobs"}
        role={accessRole}
        onDashboard={() => setView("dashboard")}
        onJobs={() => setView("jobs")}
        onAgent={() => setDrawerOpen(true)}
        onTraining={() => { setRestoredTraining(undefined); setView("training"); }}
        onTrainingDashboard={() => setView("training-dashboard")}
        onAccess={() => setView("access")}
      />
      <main className="app-main">
        {view === "access" ? (
          <AccessControlPage role={accessRole} onRoleChange={setAccessRole} />
        ) : view === "training" ? (
          <TrainingAgentFlow key={restoredTraining?.id ?? "new-training"} initialRecord={restoredTraining} onBack={() => setView("dashboard")} />
        ) : view === "training-dashboard" ? (
          <TrainingDashboard onCreateTraining={() => { setRestoredTraining(undefined); setView("training"); }} onOpenRecord={(record) => { setRestoredTraining(record); setView("training"); }} />
        ) : view === "jobs" ? (
          <JobsPage onCreate={() => { setRestoredProject(undefined); setRestoredDraft(undefined); setView("real"); }} onOpen={(project) => { setRestoredDraft(undefined); setRestoredProject(project); setView("real"); }} onOpenDraft={(draft) => { setRestoredProject(undefined); setRestoredDraft(draft); setView("real"); }} />
        ) : view === "demo" ? (
          <Workspace
            stage={stage}
            selectedCandidate={selectedCandidate}
            onStageChange={setStage}
            onSelectCandidate={openCandidate}
            onAgentOpen={() => setDrawerOpen(true)}
            onBack={() => setView("dashboard")}
          />
        ) : view === "real" ? (
          <RealAgentFlow key={restoredProject?.id ?? restoredDraft?.id ?? "new-project"} initialProject={restoredProject} initialDraft={restoredDraft} onBack={() => setView("dashboard")} />
        ) : (
          <Dashboard
            isStarting={isStarting}
            onStartDemo={startDemo}
            onCreateJob={() => { setRestoredProject(undefined); setRestoredDraft(undefined); setView("real"); }}
            onOpenProject={(project) => { setRestoredDraft(undefined); setRestoredProject(project); setView("real"); }}
          />
        )}
      </main>
      <AgentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
