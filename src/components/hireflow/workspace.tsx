import { Activity, ArrowLeft, Bot, Check, ChevronRight, MoreHorizontal } from "lucide-react";
import { demoJob } from "@/lib/demo-data";
import type { Candidate, Stage } from "@/lib/types";
import { CandidatesPanel } from "./candidates-panel";
import { InterviewPanel } from "./interview-panel";
import { ReportPanel } from "./report-panel";
import { RequirementsPanel } from "./requirements-panel";

const stages: { id: Stage; label: string }[] = [
  { id: "requirements", label: "岗位要求" },
  { id: "candidates", label: "候选人" },
  { id: "interview", label: "面试" },
  { id: "report", label: "报告" },
];

interface WorkspaceProps {
  stage: Stage;
  selectedCandidate: Candidate;
  onStageChange: (stage: Stage) => void;
  onSelectCandidate: (candidate: Candidate) => void;
  onAgentOpen: () => void;
  onBack: () => void;
}

export function Workspace({ stage, selectedCandidate, onStageChange, onSelectCandidate, onAgentOpen, onBack }: WorkspaceProps) {
  const stageIndex = stages.findIndex((item) => item.id === stage);

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div className="workspace-title">
          <button className="icon-button" aria-label="返回总览" onClick={onBack}><ArrowLeft size={18} /></button>
          <span className="job-icon job-icon-small">AI</span>
          <div><p>虚构演示数据 · 智能产品中心</p><h1>{demoJob.title}</h1></div>
        </div>
        <div className="header-actions">
          <span className="demo-data-badge">演示样例</span>
          <button className="button button-secondary" onClick={onAgentOpen}><Activity size={16} />Agent 运行记录</button>
          <button className="icon-button" aria-label="更多操作"><MoreHorizontal size={19} /></button>
        </div>
      </header>

      <nav className="stage-nav" aria-label="招聘阶段">
        {stages.map((item, index) => (
          <div className="stage-group" key={item.id}>
            <button
              className={index === stageIndex ? "stage-step current" : index < stageIndex ? "stage-step complete" : "stage-step"}
              onClick={() => onStageChange(item.id)}
              aria-current={index === stageIndex ? "step" : undefined}
            >
              <span>{index < stageIndex ? <Check size={14} /> : index + 1}</span>{item.label}
            </button>
            {index < stages.length - 1 && <ChevronRight className="stage-chevron" size={16} aria-hidden="true" />}
          </div>
        ))}
        <button className="agent-state" onClick={onAgentOpen}><span className="pulse" /><Bot size={15} />虚构演示工作流</button>
      </nav>

      <div className="workspace-content">
        {stage === "requirements" && <RequirementsPanel onContinue={() => onStageChange("candidates")} />}
        {stage === "candidates" && <CandidatesPanel selectedCandidate={selectedCandidate} onSelect={onSelectCandidate} onContinue={() => onStageChange("interview")} />}
        {stage === "interview" && <InterviewPanel candidate={selectedCandidate} onContinue={() => onStageChange("report")} />}
        {stage === "report" && <ReportPanel candidate={selectedCandidate} />}
      </div>
    </div>
  );
}
