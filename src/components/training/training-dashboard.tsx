"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Clock3, GraduationCap, LoaderCircle, RefreshCw, Target, UsersRound } from "lucide-react";
import type { TrainingAnalytics, TrainingRecord, TrainingRecordSnapshot } from "@/lib/training/schemas";

interface Filters { topic: string; recommendation: string; days: string }

export function TrainingDashboard({ onCreateTraining, onOpenRecord }: { onCreateTraining: () => void; onOpenRecord: (record: TrainingRecordSnapshot) => void }) {
  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [filters, setFilters] = useState<Filters>({ topic: "", recommendation: "", days: "30" });
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.recommendation) params.set("recommendation", filters.recommendation);
    if (filters.days) params.set("days", filters.days);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let active = true;
    fetch(`/api/training-analytics?${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("读取失败");
        return response.json() as Promise<{ analytics: TrainingAnalytics }>;
      })
      .then((result) => { if (active) { setAnalytics(result.analytics); setError(null); } })
      .catch(() => { if (active) setError("暂时无法读取培训数据，请稍后重试。"); });
    return () => { active = false; };
  }, [query]);

  function changeFilter(field: keyof Filters, value: string) {
    setAnalytics(null);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function openReport(id: string) {
    setOpeningId(id);
    try {
      const response = await fetch(`/api/training-records/${id}`);
      if (!response.ok) throw new Error("读取失败");
      const result = await response.json() as { record: TrainingRecord };
      onOpenRecord(result.record.snapshot);
    } catch {
      setError("培训报告读取失败，请重试。");
    } finally {
      setOpeningId(null);
    }
  }

  const weakest = analytics?.dimensionAverages[0];

  return <div className="page training-dashboard-page">
    <header className="topbar training-dashboard-header"><div><p className="eyebrow">LEARNING INTELLIGENCE</p><h1>培训效果看板</h1><span>基于已归档的 AI 陪练报告，识别团队能力短板和重点辅导对象。</span></div><button className="button button-primary" type="button" onClick={onCreateTraining}><GraduationCap size={16} />创建培训</button></header>

    <section className="training-dashboard-filters" aria-label="培训数据筛选">
      <label><span>时间范围</span><select value={filters.days} onChange={(event) => changeFilter("days", event.target.value)}><option value="">全部时间</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="90">近 90 天</option></select></label>
      <label><span>培训主题</span><select value={filters.topic} onChange={(event) => changeFilter("topic", event.target.value)}><option value="">全部主题</option>{analytics?.availableTopics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}</select></label>
      <label><span>培训结论</span><select value={filters.recommendation} onChange={(event) => changeFilter("recommendation", event.target.value)}><option value="">全部结论</option><option value="通过">通过</option><option value="建议再次练习">建议再次练习</option><option value="需要辅导">需要辅导</option></select></label>
      <button className="icon-button" type="button" aria-label="重置筛选" onClick={() => { setAnalytics(null); setFilters({ topic: "", recommendation: "", days: "30" }); }}><RefreshCw size={15} /></button>
    </section>

    {error ? <div className="history-state error" role="alert">{error}</div> : !analytics ? <div className="training-dashboard-loading" role="status"><LoaderCircle className="spin" size={20} />正在汇总培训数据…</div> : analytics.metrics.totalCompletions === 0 ? <section className="training-dashboard-empty"><BarChart3 size={28} /><h2>当前筛选范围内还没有培训数据</h2><p>完成一次角色陪练并生成报告后，看板会自动更新。</p><button className="button button-primary" type="button" onClick={onCreateTraining}>开始第一次培训<ArrowRight size={15} /></button></section> : <>
      <section className="training-kpi-grid" aria-label="培训核心指标">
        <article className="primary"><span><BrainCircuit size={16} />团队平均得分</span><strong>{analytics.metrics.averageScore}<sup>/100</sup></strong><small>{analytics.metrics.averageScore >= 80 ? "达到建议目标" : analytics.metrics.averageScore >= 70 ? "接近目标，仍需强化" : "低于 70 分，需要重点干预"}</small></article>
        <article><span><CheckCircle2 size={16} />培训完成</span><strong>{analytics.metrics.totalCompletions}</strong><small>已归档报告</small></article>
        <article><span><UsersRound size={16} />参训人数</span><strong>{analytics.metrics.uniqueLearners}</strong><small>去重学员</small></article>
        <article><span><Target size={16} />通过率</span><strong>{analytics.metrics.passRate}<sup>%</sup></strong><small>平均 {analytics.metrics.averageTurns} 轮学员表达</small></article>
      </section>

      {weakest && <section className="training-insight-callout"><span><Target size={18} /></span><div><p>当前最薄弱能力</p><h2>{weakest.label} · {weakest.averageScore} 分</h2><small>基于 {weakest.sampleSize} 份报告，建议将它设为下一轮培训重点。</small></div></section>}

      <div className="training-dashboard-grid">
        <section className="dashboard-panel"><header><div><p className="eyebrow">CAPABILITY MAP</p><h2>能力维度平均分</h2></div><span>低分优先</span></header><div className="dimension-bar-list">{analytics.dimensionAverages.map((item) => <article key={item.label}><div><strong>{item.label}</strong><small>{item.sampleSize} 份报告</small></div><i><b style={{ width: `${item.averageScore}%` }} /></i><em>{item.averageScore}</em></article>)}</div></section>

        <section className="dashboard-panel"><header><div><p className="eyebrow">LEARNER RANKING</p><h2>学员表现</h2></div><span>按平均分排序</span></header><div className="learner-ranking">{analytics.learners.map((learner, index) => <button type="button" key={learner.traineeName} onClick={() => void openReport(learner.latestRecordId)} disabled={openingId === learner.latestRecordId}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{learner.traineeName}</strong><small><Clock3 size={11} />{learner.attempts} 次训练 · 最佳 {learner.bestScore}</small></span><b>{learner.averageScore}</b>{openingId === learner.latestRecordId ? <LoaderCircle className="spin" size={14} /> : <ArrowRight size={14} />}</button>)}</div></section>

        <section className="dashboard-panel"><header><div><p className="eyebrow">TOPIC PERFORMANCE</p><h2>培训主题效果</h2></div><span>{analytics.topics.length} 个主题</span></header><div className="topic-performance">{analytics.topics.map((topic) => <article key={topic.topic}><span><strong>{topic.topic}</strong><small>{topic.attempts} 次完成</small></span><i><b style={{ width: `${topic.averageScore}%` }} /></i><em>{topic.averageScore}</em></article>)}</div></section>

        <section className="dashboard-panel"><header><div><p className="eyebrow">SCORE TREND</p><h2>最近培训趋势</h2></div><span>最多 12 个日期</span></header><div className="training-trend" aria-label="培训得分趋势">{analytics.trend.map((point) => <article key={point.date} title={`${point.date}：${point.averageScore} 分，${point.attempts} 次`}><b style={{ height: `${Math.max(10, point.averageScore)}%` }} /><span>{point.averageScore}</span><small>{point.date.slice(5)}</small></article>)}</div></section>
      </div>
    </>}
  </div>;
}
