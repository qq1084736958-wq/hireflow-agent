"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3, FileText, LoaderCircle, RefreshCw, Trash2, UserRound } from "lucide-react";
import type { TrainingRecord, TrainingRecordSnapshot, TrainingRecordSummary } from "@/lib/training/schemas";

async function fetchSummaries() {
  const response = await fetch("/api/training-records?page=1&pageSize=20");
  if (!response.ok) throw new Error("读取失败");
  return response.json() as Promise<{ data: TrainingRecordSummary[] }>;
}

export function TrainingHistory({ refreshKey, onOpenRecord }: { refreshKey: number; onOpenRecord: (record: TrainingRecordSnapshot) => void }) {
  const [records, setRecords] = useState<TrainingRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummaries();
      setRecords(result.data);
    } catch {
      setError("暂时无法读取培训记录，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchSummaries()
      .then((result) => { if (active) setRecords(result.data); })
      .catch(() => { if (active) setError("暂时无法读取培训记录，请稍后重试。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  async function openRecord(id: string) {
    setOpeningId(id);
    setError(null);
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

  async function removeRecord(record: TrainingRecordSummary) {
    if (!window.confirm(`确定删除“${record.title} · ${record.traineeName}”吗？此操作无法撤销。`)) return;
    const response = await fetch(`/api/training-records/${record.id}`, { method: "DELETE" });
    if (response.ok) setRecords((current) => current.filter((item) => item.id !== record.id));
    else setError("培训记录删除失败，请重试。");
  }

  return <section className="training-history" aria-labelledby="training-history-title">
    <div className="section-heading">
      <div><p className="eyebrow">LEARNING ARCHIVE</p><h2 id="training-history-title">历史培训记录</h2></div>
      <button className="text-button" type="button" onClick={() => void load()}><RefreshCw size={13} />刷新</button>
    </div>
    {loading ? <div className="history-state" role="status"><LoaderCircle className="spin" size={18} />正在读取培训记录…</div>
      : error ? <div className="history-state error" role="alert">{error}</div>
      : records.length === 0 ? <div className="history-state"><FileText size={19} /><span><strong>还没有完成的培训记录</strong><small>完成角色陪练并生成报告后，系统会自动归档。</small></span></div>
      : <div className="training-history-list">{records.map((record) => <article className="training-history-row" key={record.id}>
        <span className="training-score">{record.overallScore}</span>
        <span className="training-history-main"><strong>{record.title}</strong><small><UserRound size={12} />{record.traineeName}<i>·</i><Clock3 size={12} />{new Date(record.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
        <span className="stage-pill"><i />{record.recommendation}</span>
        <span className="training-turns"><strong>{record.learnerTurns}</strong><small>对话轮次</small></span>
        <button className="icon-button danger" type="button" onClick={() => void removeRecord(record)} aria-label={`删除 ${record.title}`}><Trash2 size={15} /></button>
        <button className="button button-secondary" type="button" onClick={() => void openRecord(record.id)} disabled={openingId === record.id}>{openingId === record.id ? <LoaderCircle className="spin" size={14} /> : <ArrowRight size={14} />}查看报告</button>
      </article>)}</div>}
  </section>;
}
