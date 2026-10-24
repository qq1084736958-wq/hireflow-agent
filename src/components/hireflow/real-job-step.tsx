"use client";

import { ArrowRight, CheckCircle2, FileSearch, LoaderCircle, ShieldCheck } from "lucide-react";

const samplePlaceholder = `例如：负责企业级 AI 产品从需求洞察、方案设计到上线迭代的完整流程；能够将大模型能力转化为稳定、可衡量的产品体验；与算法、工程和业务团队协作，推动产品落地……`;

export function RealJobStep({ busy, title, jd, draftState, onChange, onSubmit }: {
  busy: boolean;
  title: string;
  jd: string;
  draftState: "idle" | "saving" | "saved" | "error";
  onChange: (value: { title: string; jd: string }) => void;
  onSubmit: (title: string, jd: string) => void;
}) {
  const ready = title.trim().length >= 2 && jd.trim().length >= 80;

  return (
    <section className="real-card">
      <div className="real-card-heading"><span className="real-card-icon"><FileSearch size={19} /></span><div><p>STEP 01 · JOB ANALYST</p><h2>输入真实职位描述</h2><span>Agent 会把自然语言 JD 转换为可编辑、可评分的岗位能力模型。</span></div></div>
      <div className="real-form">
        <label><span>职位名称</span><input value={title} onChange={(event) => onChange({ title: event.target.value, jd })} placeholder="例如：AI 产品经理" /></label>
        <label><span>职位描述（JD）</span><textarea value={jd} onChange={(event) => onChange({ title, jd: event.target.value })} placeholder={samplePlaceholder} rows={13} /><small>{jd.trim().length} / 30,000 字符 · 至少输入 80 个字符</small></label>
      </div>
      <div className="real-card-footer"><span className={`draft-save-status ${draftState}`}>{draftState === "saving" ? <LoaderCircle className="spin" size={14} /> : draftState === "idle" ? <ShieldCheck size={15} /> : <CheckCircle2 size={14} />}{draftState === "saving" ? "正在自动保存草稿" : draftState === "saved" ? "草稿已保存，可在职位页继续编辑" : draftState === "error" ? "草稿保存失败" : "输入后自动保存草稿"}</span><button className="button button-primary" disabled={!ready || busy} onClick={() => onSubmit(title.trim(), jd.trim())}>{busy ? <><LoaderCircle className="spin" size={16} />正在解析</> : <>解析岗位要求 <ArrowRight size={16} /></>}</button></div>
    </section>
  );
}
