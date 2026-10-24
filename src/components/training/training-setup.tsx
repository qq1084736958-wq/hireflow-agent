"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, BookOpen, Clock3, LoaderCircle, Save, Trash2 } from "lucide-react";
import {
  deleteTrainingDraft,
  isTrainingBriefEmpty,
  readTrainingDrafts,
  saveTrainingDraft,
  type TrainingDraft,
} from "@/lib/training/drafts";
import type { TrainingBrief } from "@/lib/training/schemas";

const EMPTY_BRIEF: TrainingBrief = {
  traineeName: "",
  topic: "",
  audience: "",
  objective: "",
  context: "",
};

function formatDraftTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrainingSetup({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (brief: TrainingBrief) => Promise<boolean>;
}) {
  const [brief, setBrief] = useState<TrainingBrief>(EMPTY_BRIEF);
  const [drafts, setDrafts] = useState<TrainingDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const mounted = useRef(false);
  const currentDraftIdRef = useRef<string | null>(null);

  const valid = brief.traineeName.trim().length >= 1
    && brief.topic.trim().length >= 2
    && brief.audience.trim().length >= 2
    && brief.objective.trim().length >= 10
    && brief.context.trim().length >= 20;

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => setDrafts(readTrainingDrafts()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted.current || isTrainingBriefEmpty(brief)) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const id = currentDraftIdRef.current ?? window.crypto.randomUUID();
      const draft = { id, brief, updatedAt: new Date().toISOString() };
      setDrafts(saveTrainingDraft(draft));
      currentDraftIdRef.current = id;
      setCurrentDraftId(id);
      setSaveState("saved");
    }, 600);
    return () => window.clearTimeout(timer);
  }, [brief]);

  function update(field: keyof TrainingBrief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }));
  }

  function saveNow() {
    if (isTrainingBriefEmpty(brief)) return;
    const id = currentDraftIdRef.current ?? window.crypto.randomUUID();
    const draft = { id, brief, updatedAt: new Date().toISOString() };
    setDrafts(saveTrainingDraft(draft));
    currentDraftIdRef.current = id;
    setCurrentDraftId(id);
    setSaveState("saved");
  }

  function restoreDraft(draft: TrainingDraft) {
    setBrief(draft.brief);
    currentDraftIdRef.current = draft.id;
    setCurrentDraftId(draft.id);
    setDraftsOpen(false);
    setSaveState("saved");
  }

  function removeDraft(draft: TrainingDraft) {
    setDrafts(deleteTrainingDraft(draft.id));
    if (currentDraftId === draft.id) {
      currentDraftIdRef.current = null;
      setCurrentDraftId(null);
      setBrief(EMPTY_BRIEF);
      setSaveState("idle");
    }
  }

  async function submit() {
    const succeeded = await onSubmit(brief);
    if (!succeeded || !currentDraftId) return;
    setDrafts(deleteTrainingDraft(currentDraftId));
    currentDraftIdRef.current = null;
    setCurrentDraftId(null);
  }

  return <section className="real-card training-setup-card">
    <header className="real-card-heading training-setup-heading">
      <span className="real-card-icon"><BookOpen size={19} /></span>
      <div>
        <p>STEP 01 · LEARNING DESIGNER</p>
        <h2>创建培训任务</h2>
        <span>输入真实业务目标，Agent 将生成培训内容、陪练角色和评分标准。</span>
      </div>
      <button
        className="training-draft-toggle"
        type="button"
        aria-expanded={draftsOpen}
        aria-controls="training-draft-list"
        onClick={() => setDraftsOpen((current) => !current)}
      >
        <Archive size={15} />
        草稿箱
        {drafts.length > 0 && <b>{drafts.length}</b>}
      </button>
    </header>

    {draftsOpen && <section className="training-draft-panel" id="training-draft-list" aria-label="培训任务草稿箱">
      <div className="training-draft-panel-heading">
        <div><strong>培训任务草稿</strong><small>最多保留最近 8 条，仅存储在当前浏览器</small></div>
      </div>
      {drafts.length === 0
        ? <div className="training-draft-empty" role="status"><Archive size={17} />填写内容后会自动保存到这里</div>
        : <div className="training-draft-list">{drafts.map((draft) => <article key={draft.id}>
          <span>
            <strong>{draft.brief.topic.trim() || "未命名培训任务"}</strong>
            <small><Clock3 size={11} />{formatDraftTime(draft.updatedAt)} · {draft.brief.traineeName.trim() || "未填写学员"}</small>
          </span>
          <button className="text-button" type="button" onClick={() => restoreDraft(draft)}>继续填写</button>
          <button className="icon-button danger" type="button" aria-label={`删除草稿 ${draft.brief.topic || "未命名培训任务"}`} onClick={() => removeDraft(draft)}><Trash2 size={14} /></button>
        </article>)}</div>}
    </section>}

    <div className="training-form">
      <label><span>学员姓名</span><input value={brief.traineeName} onChange={(event) => update("traineeName", event.target.value)} placeholder="例如：陈晨" /></label>
      <label><span>培训主题</span><input value={brief.topic} onChange={(event) => update("topic", event.target.value)} placeholder="例如：处理企业客户价格异议" /></label>
      <label><span>培训受众</span><input value={brief.audience} onChange={(event) => update("audience", event.target.value)} placeholder="例如：入职 3 个月内的销售顾问" /></label>
      <label className="full"><span>培训目标</span><textarea value={brief.objective} onChange={(event) => update("objective", event.target.value)} placeholder="完成培训后，学员应能够……" /></label>
      <label className="full"><span>业务情境</span><textarea value={brief.context} onChange={(event) => update("context", event.target.value)} placeholder="描述客户、产品、常见困难和需要练习的真实场景……" /></label>
    </div>
    <footer className="real-card-footer training-setup-footer">
      <span aria-live="polite">{saveState === "saving" ? "正在保存草稿…" : saveState === "saved" ? "草稿已自动保存" : "填写后将自动保存"}</span>
      <div>
        <button className="button button-secondary" type="button" disabled={isTrainingBriefEmpty(brief) || busy} onClick={saveNow}><Save size={15} />保存草稿</button>
        <button className="button button-primary" type="button" disabled={!valid || busy} onClick={() => void submit()}>{busy ? <LoaderCircle className="spin" size={16} /> : <BookOpen size={16} />}生成培训内容<ArrowRight size={16} /></button>
      </div>
    </footer>
  </section>;
}
