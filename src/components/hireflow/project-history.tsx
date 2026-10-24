"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3, FileText, LoaderCircle, Trash2, Users } from "lucide-react";
import type { ProjectRecord, ProjectSnapshot, ProjectStage, ProjectSummary } from "@/lib/projects/schema";

const stageLabel: Record<ProjectStage, string> = {
  job: "岗位创建",
  resume: "等待简历",
  match: "候选人排名",
  interview: "结构化面试",
  report: "报告完成",
};

async function fetchProjectSummaries() {
  const response = await fetch("/api/projects?page=1&pageSize=20");
  if (!response.ok) throw new Error("读取失败");
  return response.json() as Promise<{ data: ProjectSummary[] }>;
}

export function ProjectHistory({ onOpenProject }: { onOpenProject: (project: ProjectSnapshot) => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProjectSummaries();
      setProjects(result.data);
    } catch {
      setError("暂时无法读取历史项目，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchProjectSummaries()
      .then((result) => { if (active) setProjects(result.data); })
      .catch(() => { if (active) setError("暂时无法读取历史项目，请稍后重试。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function openProject(id: string) {
    setOpeningId(id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error("读取失败");
      const result = await response.json() as { project: ProjectRecord };
      onOpenProject(result.project.snapshot);
    } catch {
      setError("项目恢复失败，请重试。");
    } finally {
      setOpeningId(null);
    }
  }

  async function removeProject(project: ProjectSummary) {
    if (!window.confirm(`确定删除“${project.title}”吗？此操作无法撤销。`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) setProjects((current) => current.filter((item) => item.id !== project.id));
    else setError("项目删除失败，请重试。");
  }

  return (
    <section className="section-block project-history-section" aria-labelledby="history-title">
      <div className="section-heading"><div><p className="eyebrow">SAVED WORKFLOWS</p><h2 id="history-title">历史招聘项目</h2></div><button className="text-button" type="button" onClick={() => void loadProjects()}>刷新</button></div>
      {loading ? <div className="history-state" role="status"><LoaderCircle className="spin" size={18} />正在读取项目…</div> : error ? <div className="history-state error" role="alert">{error}</div> : projects.length === 0 ? <div className="history-state"><FileText size={19} /><span><strong>还没有保存的招聘项目</strong><small>创建职位后，系统会自动保存每一步结果。</small></span></div> : <div className="project-history-list">
        {projects.map((project) => <article className="project-history-row" key={project.id}>
          <span className="job-icon">{project.title.slice(0, 1).toUpperCase()}</span>
          <span className="project-history-main"><strong>{project.title}</strong><small><Clock3 size={12} />{new Date(project.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
          <span className="stage-pill"><i />{stageLabel[project.stage]}</span>
          <span className="project-history-metric"><strong>{project.candidateCount}</strong><small><Users size={11} />候选人</small></span>
          <span className="project-history-metric"><strong>{project.topScore ?? "—"}</strong><small>最高匹配</small></span>
          <button className="icon-button danger" type="button" onClick={() => void removeProject(project)} aria-label={`删除 ${project.title}`}><Trash2 size={15} /></button>
          <button className="button button-secondary" type="button" onClick={() => void openProject(project.id)} disabled={openingId === project.id}>{openingId === project.id ? <LoaderCircle className="spin" size={14} /> : <ArrowRight size={14} />}继续</button>
        </article>)}
      </div>}
    </section>
  );
}
