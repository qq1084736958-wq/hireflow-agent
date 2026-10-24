"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, FileCheck2, FilePenLine, LoaderCircle, Plus, Search, Trash2, UsersRound } from "lucide-react";
import type { ProjectRecord, ProjectSnapshot, ProjectStage, ProjectSummary, RecruitmentAnalytics } from "@/lib/projects/schema";
import type { JobDraft } from "@/lib/projects/job-drafts";

const stageLabel: Record<ProjectStage, string> = { job: "职位解析", resume: "等待简历", match: "候选人排名", interview: "面试评估", report: "报告完成" };

export function JobsPage({ onCreate, onOpen, onOpenDraft }: { onCreate: () => void; onOpen: (project: ProjectSnapshot) => void; onOpenDraft: (draft: JobDraft) => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const [analytics, setAnalytics] = useState<RecruitmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"all" | ProjectStage>("all");
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [projectsResponse, analyticsResponse, draftsResponse] = await Promise.all([
        fetch("/api/projects?page=1&pageSize=50"),
        fetch("/api/recruitment-analytics"),
        fetch("/api/job-drafts"),
      ]);
      if (!projectsResponse.ok || !analyticsResponse.ok || !draftsResponse.ok) throw new Error("读取失败");
      const projectResult = await projectsResponse.json() as { data: ProjectSummary[] };
      const analyticsResult = await analyticsResponse.json() as { analytics: RecruitmentAnalytics };
      const draftResult = await draftsResponse.json() as { drafts: JobDraft[] };
      setProjects(projectResult.data);
      setAnalytics(analyticsResult.analytics);
      setDrafts(draftResult.drafts);
    } catch {
      setError("暂时无法读取职位数据，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/projects?page=1&pageSize=50"), fetch("/api/recruitment-analytics"), fetch("/api/job-drafts")])
      .then(async ([projectsResponse, analyticsResponse, draftsResponse]) => {
        if (!projectsResponse.ok || !analyticsResponse.ok || !draftsResponse.ok) throw new Error("读取失败");
        return Promise.all([
          projectsResponse.json() as Promise<{ data: ProjectSummary[] }>,
          analyticsResponse.json() as Promise<{ analytics: RecruitmentAnalytics }>,
          draftsResponse.json() as Promise<{ drafts: JobDraft[] }>,
        ]);
      })
      .then(([projectResult, analyticsResult, draftResult]) => { if (active) { setProjects(projectResult.data); setAnalytics(analyticsResult.analytics); setDrafts(draftResult.drafts); } })
      .catch(() => { if (active) setError("暂时无法读取职位数据，请稍后重试。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => projects.filter((project) => {
    if (stage !== "all" && project.stage !== stage) return false;
    return project.title.toLowerCase().includes(query.trim().toLowerCase());
  }), [projects, query, stage]);

  async function openProject(id: string) {
    setOpeningId(id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error("读取失败");
      const result = await response.json() as { project: ProjectRecord };
      onOpen(result.project.snapshot);
    } catch {
      setError("项目恢复失败，请重试。");
    } finally {
      setOpeningId(null);
    }
  }

  async function removeProject(project: ProjectSummary) {
    if (!window.confirm(`确定删除“${project.title}”吗？此操作无法撤销。`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) await load();
    else setError("项目删除失败，请重试。");
  }

  async function removeDraft(draft: JobDraft) {
    if (!window.confirm(`确定删除草稿“${draft.title.trim() || "未命名职位"}”吗？`)) return;
    const response = await fetch(`/api/job-drafts/${draft.id}`, { method: "DELETE" });
    if (response.ok) await load();
    else setError("草稿删除失败，请重试。");
  }

  return <div className="page jobs-page">
    <header className="topbar jobs-header"><div><p className="eyebrow">RECRUITMENT PROJECTS</p><h1>职位管理</h1><span>所有职位和候选人数据均来自已保存的真实 Agent 工作流。</span></div><button className="button button-primary" type="button" onClick={onCreate}><Plus size={16} />创建职位</button></header>

    <section className="jobs-summary" aria-label="职位统计">
      <article><span>全部职位</span><strong>{projects.length}</strong><small><BriefcaseBusiness size={13} />已保存项目</small></article>
      <article><span>进行中</span><strong>{analytics?.metrics.activeProjects ?? "—"}</strong><small>尚未完成报告</small></article>
      <article><span>已评估候选人</span><strong>{analytics?.metrics.evaluatedCandidates ?? "—"}</strong><small><UsersRound size={13} />完成人岗匹配</small></article>
      <article><span>完成报告</span><strong>{analytics?.metrics.completedReports ?? "—"}</strong><small><FileCheck2 size={13} />结构化报告</small></article>
    </section>

    <section className="job-draft-section" aria-labelledby="job-draft-title">
      <div className="section-heading"><div><p className="eyebrow">DRAFT BOX</p><h2 id="job-draft-title">职位草稿箱</h2></div><span className="section-note">{drafts.length} 份未提交草稿</span></div>
      {drafts.length === 0 ? <div className="draft-empty"><FilePenLine size={18} /><span>填写职位名称或 JD 后会自动保存到这里。</span></div> : <div className="job-draft-list">{drafts.map((draft) => <article className="job-draft-row" key={draft.id}>
        <span className="job-icon"><FilePenLine size={17} /></span>
        <span><strong>{draft.title.trim() || "未命名职位"}</strong><small>{draft.jd.trim().length} 个字符 · 保存于 {new Date(draft.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
        <button className="icon-button danger" type="button" onClick={() => void removeDraft(draft)} aria-label={`删除草稿 ${draft.title || "未命名职位"}`}><Trash2 size={15} /></button>
        <button className="button button-secondary" type="button" onClick={() => onOpenDraft(draft)}><ArrowRight size={14} />继续编辑</button>
      </article>)}</div>}
    </section>

    <section className="jobs-list-section" aria-labelledby="jobs-list-title">
      <div className="section-heading"><div><p className="eyebrow">PROJECT LIST</p><h2 id="jobs-list-title">全部职位</h2></div><span className="section-note">{filtered.length} 个结果</span></div>
      <div className="jobs-toolbar"><label><Search size={15} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索职位名称" aria-label="搜索职位名称" /></label><select value={stage} onChange={(event) => setStage(event.target.value as "all" | ProjectStage)} aria-label="按阶段筛选"><option value="all">全部阶段</option>{Object.entries(stageLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>

      {loading ? <div className="history-state" role="status"><LoaderCircle className="spin" size={18} />正在读取职位…</div>
        : error ? <div className="history-state error" role="alert">{error}</div>
        : projects.length === 0 ? <div className="jobs-empty"><BriefcaseBusiness size={28} /><h3>还没有真实职位</h3><p>创建职位并输入 JD 后，Agent 会自动保存每一步结果。</p><button className="button button-primary" type="button" onClick={onCreate}>创建第一个职位<ArrowRight size={15} /></button></div>
        : filtered.length === 0 ? <div className="history-state">没有符合当前筛选条件的职位。</div>
        : <div className="jobs-project-list">{filtered.map((project) => <article className="jobs-project-row" key={project.id}>
          <span className="job-icon">{project.title.slice(0, 2).toUpperCase()}</span>
          <span className="jobs-project-main"><strong>{project.title}</strong><small>更新于 {new Date(project.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
          <span className="stage-pill"><i />{stageLabel[project.stage]}</span>
          <span className="jobs-project-metric"><strong>{project.candidateCount}</strong><small>候选人</small></span>
          <span className="jobs-project-metric"><strong>{project.topScore ?? "—"}</strong><small>最高匹配</small></span>
          <button className="icon-button danger" type="button" onClick={() => void removeProject(project)} aria-label={`删除 ${project.title}`}><Trash2 size={15} /></button>
          <button className="button button-secondary" type="button" onClick={() => void openProject(project.id)} disabled={openingId === project.id}>{openingId === project.id ? <LoaderCircle className="spin" size={14} /> : <ArrowRight size={14} />}继续</button>
        </article>)}</div>}
    </section>
  </div>;
}
