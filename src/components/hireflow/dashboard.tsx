"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bot, Check, ChevronRight, FileCheck2, FileSearch, LoaderCircle, Plus, ShieldCheck, UsersRound } from "lucide-react";
import type { ProjectRecord, ProjectSnapshot, ProjectStage, RecruitmentAnalytics } from "@/lib/projects/schema";
import { ProjectHistory } from "./project-history";

interface DashboardProps {
  isStarting: boolean;
  onStartDemo: () => void;
  onCreateJob: () => void;
  onOpenProject: (project: ProjectSnapshot) => void;
}

const stageLabel: Record<ProjectStage, string> = { job: "职位解析", resume: "等待简历", match: "候选人排名", interview: "面试评估", report: "报告完成" };

export function Dashboard({ isStarting, onStartDemo, onCreateJob, onOpenProject }: DashboardProps) {
  const [analytics, setAnalytics] = useState<RecruitmentAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/recruitment-analytics")
      .then(async (response) => { if (!response.ok) throw new Error("读取失败"); return response.json() as Promise<{ analytics: RecruitmentAnalytics }>; })
      .then((result) => { if (active) { setAnalytics(result.analytics); setAnalyticsError(false); } })
      .catch(() => { if (active) setAnalyticsError(true); });
    return () => { active = false; };
  }, []);

  async function openProject(id: string) {
    setOpeningId(id);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error("读取失败");
      const result = await response.json() as { project: ProjectRecord };
      onOpenProject(result.project.snapshot);
    } finally {
      setOpeningId(null);
    }
  }
  return (
    <div className="page dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">7 月 22 日 · 招聘工作台</p>
          <h1>早上好，今天从关键候选人开始。</h1>
        </div>
        <button className="button button-primary" onClick={onCreateJob}><Plus size={17} aria-hidden="true" />创建职位</button>
      </header>

      <section className="demo-banner" aria-labelledby="demo-title">
        <div className="demo-copy">
          <span className="demo-kicker"><Bot size={15} aria-hidden="true" />可交互 Agent 演示</span>
          <h2 id="demo-title">5 分钟，看清一条招聘决策链。</h2>
          <p>从一份真实感 JD 和三位虚构候选人出发，查看 Agent 如何解析、找证据、评分并准备面试。</p>
          <div className="demo-actions">
            <button className="button button-light" onClick={onStartDemo} disabled={isStarting}>
              {isStarting ? "正在载入工作流…" : "运行完整样例"}<ArrowRight size={17} aria-hidden="true" />
            </button>
            <span><ShieldCheck size={16} aria-hidden="true" />所有数据均为虚构</span>
          </div>
        </div>
        <div className="demo-visual" aria-label="Agent 流程概览">
          <div className="run-status"><span className="pulse" />Agent run · ready</div>
          {[
            ["01", "Job Analyst", "提取岗位能力模型", "5 项要求"],
            ["02", "Resume Analyst", "并行读取候选人证据", "3 份简历"],
            ["03", "Match Evaluator", "按统一量表计算排名", "15 项评分"],
          ].map(([number, agent, action, meta]) => (
            <div className="agent-row" key={number}>
              <span className="agent-number">{number}</span>
              <span><strong>{agent}</strong><small>{action}</small></span>
              <em><Check size={13} aria-hidden="true" />{meta}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="metrics" aria-label="招聘概览">
        <article><span>进行中职位</span><strong>{analyticsError ? "—" : analytics?.metrics.activeProjects ?? "…"}</strong><small><BriefcaseIcon />数据库实时统计</small></article>
        <article><span>已评估候选人</span><strong>{analyticsError ? "—" : analytics?.metrics.evaluatedCandidates ?? "…"}</strong><small><UsersRound size={14} />已完成人岗匹配</small></article>
        <article><span>平均匹配度</span><strong>{analyticsError ? "—" : analytics?.metrics.averageMatchScore ?? "…"}{analytics && <sup>%</sup>}</strong><small><FileSearch size={14} />基于全部匹配结果</small></article>
        <article><span>已完成报告</span><strong>{analyticsError ? "—" : analytics?.metrics.completedReports ?? "…"}</strong><small><FileCheck2 size={14} />结构化面试报告</small></article>
      </section>

      <ProjectHistory onOpenProject={onOpenProject} />

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">ACTIVE ROLE</p><h2>正在进行的招聘</h2></div>
          <span className="section-note">来自已保存项目</span>
        </div>
        {analyticsError ? <div className="history-state error" role="alert">招聘数据读取失败，请刷新页面重试。</div> : !analytics ? <div className="history-state" role="status"><LoaderCircle className="spin" size={18} />正在读取招聘项目…</div> : analytics.activeProjects.length === 0 ? <div className="history-state"><span><strong>目前没有进行中的招聘</strong><small>创建职位后，项目会自动出现在这里。</small></span></div> : analytics.activeProjects.map((project) => <button className="job-row" key={project.id} onClick={() => void openProject(project.id)} disabled={openingId === project.id}>
          <span className="job-icon">{project.title.slice(0, 2).toUpperCase()}</span>
          <span className="job-main"><strong>{project.title}</strong><small>更新于 {new Date(project.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
          <span className="stage-pill"><i />{stageLabel[project.stage]}</span>
          <span className="candidate-stack" aria-label={`${project.candidateCount} 位已评估候选人`}>{project.candidateInitials.map((initial, index) => <i key={`${initial}-${index}`}>{initial}</i>)}</span>
          <span className="job-score"><strong>{project.topScore ?? "—"}</strong><small>最高匹配</small></span>
          {openingId === project.id ? <LoaderCircle className="spin" size={17} /> : <ChevronRight size={19} aria-hidden="true" />}
        </button>)}
      </section>
    </div>
  );
}

function BriefcaseIcon() {
  return <span className="mini-swatch" aria-hidden="true" />;
}
