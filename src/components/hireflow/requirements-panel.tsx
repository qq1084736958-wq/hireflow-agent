"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, PencilLine, Sparkles } from "lucide-react";
import { demoJob, requirements as initialRequirements } from "@/lib/demo-data";

export function RequirementsPanel({ onContinue }: { onContinue: () => void }) {
  const [requirements, setRequirements] = useState(initialRequirements);
  const totalWeight = useMemo(() => requirements.reduce((sum, item) => sum + item.weight, 0), [requirements]);

  function updateWeight(id: string, weight: number) {
    setRequirements((items) => items.map((item) => item.id === id ? { ...item, weight } : item));
  }

  return (
    <section className="panel-layout">
      <div className="panel-main">
        <div className="content-heading">
          <div><p className="eyebrow">JOB MODEL · V1</p><h2>确认岗位能力模型</h2><p>Agent 已将 JD 转换为可评分的要求。确认后，所有候选人将使用同一标准。</p></div>
          <span className="success-chip"><CheckCircle2 size={15} />解析完成</span>
        </div>

        <div className="notice"><Sparkles size={17} /><span><strong>Job Analyst 发现 5 项关键要求</strong>，并将“AI 产品落地”设为最高权重。你可以在继续前修改。</span></div>

        <div className="requirement-list">
          <div className="list-header"><span>能力要求</span><span>类型</span><span>权重</span></div>
          {requirements.map((item) => (
            <article className="requirement-row" key={item.id}>
              <span className="drag-handle" aria-hidden="true">⠿</span>
              <span className="requirement-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className={item.kind === "必备" ? "kind-chip required" : "kind-chip"}>{item.kind}</span>
              <label className="weight-field">
                <span className="sr-only">{item.label}权重</span>
                <input type="number" min="0" max="100" value={item.weight} onChange={(event) => updateWeight(item.id, Number(event.target.value))} />
                <span>%</span>
              </label>
              <button className="icon-button icon-button-quiet" aria-label={`编辑${item.label}`}><PencilLine size={16} /></button>
            </article>
          ))}
        </div>

        <div className="panel-footer">
          <div className={totalWeight === 100 ? "weight-total valid" : "weight-total invalid"}>
            {totalWeight === 100 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            权重合计 {totalWeight}%
          </div>
          <button className="button button-primary" onClick={onContinue} disabled={totalWeight !== 100}>确认并分析候选人 <ArrowRight size={17} /></button>
        </div>
      </div>

      <aside className="context-panel">
        <p className="eyebrow">ORIGINAL JD</p>
        <h3>{demoJob.title}</h3>
        <div className="job-meta"><span>{demoJob.department}</span><span>{demoJob.location}</span><span>{demoJob.headcount} 个 HC</span></div>
        <p className="jd-copy">{demoJob.jd}</p>
        <div className="context-note"><strong>待确认信息</strong><p>JD 未明确模型评估方法和数据安全职责，已转为面试验证项。</p></div>
      </aside>
    </section>
  );
}
