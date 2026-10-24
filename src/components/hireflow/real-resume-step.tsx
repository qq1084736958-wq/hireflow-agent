"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import type { JobAnalysis } from "@/lib/agent/schemas";
import type { CandidateRun } from "./real-candidate-types";
import { mergeResumeFiles } from "./resume-file-selection";

interface RealResumeStepProps {
  job: JobAnalysis;
  candidates: CandidateRun[];
  busy: boolean;
  deploymentMode: "public-cloud" | "custom-gateway";
  onJobChange: (job: JobAnalysis) => void;
  onProcess: (files: File[], text: string) => void;
  onRetry: (candidateId: string) => void;
}

const statusLabel = {
  queued: "等待处理",
  parsing: "解析简历",
  matching: "匹配评分",
  complete: "处理完成",
  error: "处理失败",
};

export function RealResumeStep({ job, candidates, busy, deploymentMode, onJobChange, onProcess, onRetry }: RealResumeStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const dragDepth = useRef(0);
  const totalWeight = job.requirements.reduce((sum, item) => sum + item.weight, 0);
  const weightsValid = totalWeight === 100;
  const canRun = (files.length > 0 || text.trim().length >= 80) && weightsValid;

  function updateWeight(requirementId: string, weight: number) {
    onJobChange({
      ...job,
      requirements: job.requirements.map((item) => item.id === requirementId
        ? { ...item, weight: Math.min(100, Math.max(0, weight)) }
        : item),
    });
  }

  function addFiles(incoming: File[]) {
    const selection = mergeResumeFiles(files, incoming);
    setFiles(selection.files);
    setFileError(selection.message);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (busy) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (busy) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!busy) addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(target: File) {
    setFiles((current) => current.filter((file) => file !== target));
    setFileError(null);
  }

  return (
    <div className="real-stack">
      <section className="real-card compact-card">
        <div className="analysis-summary"><span><CheckCircle2 size={18} /></span><div><p>岗位模型已生成 · HR 可调整权重</p><h2>{job.title}</h2><small>{job.summary}</small></div><em className={weightsValid ? "" : "invalid"}>{totalWeight}% 权重</em></div>
        <div className="real-requirements">{job.requirements.map((item) => <div key={item.id}><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.kind}</em><label className="real-weight-input"><span className="sr-only">{item.label}权重</span><input type="number" min="0" max="100" value={item.weight} disabled={busy} onChange={(event) => updateWeight(item.id, Number(event.target.value))} /><b>%</b></label></div>)}</div>
        <div className={weightsValid ? "weight-rule-status valid" : "weight-rule-status invalid"} role="status">
          {weightsValid ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
          {weightsValid ? "权重合计 100%，可运行候选人匹配。" : `权重合计 ${totalWeight}%，必须调整为 100% 才能运行匹配。`}
        </div>
      </section>

      <section className="real-card">
        <div className="real-card-heading"><span className="real-card-icon"><Users size={19} /></span><div><p>STEP 02 · BATCH RESUME ANALYST</p><h2>批量上传候选人简历</h2><span>一次选择最多 10 份 PDF 或 TXT，Agent 将并行解析并按统一岗位模型评分。</span></div></div>
        <div className="resume-privacy-notice" role="note">
          <ShieldCheck size={19} />
          <span>
            <strong>发送前自动脱敏</strong>
            <p>原始文件不落库；手机号、邮箱、身份证号和明确标注的姓名会在服务端替换，项目库只保存脱敏文本。</p>
            <small>作品集版本尚未接入企业权限审批与数据库加密，请勿上传真实生产敏感数据。</small>
          </span>
          <em>{deploymentMode === "custom-gateway" ? "企业自定义网关" : "公网 DeepSeek API"}</em>
        </div>
        <label
          className={`file-drop${dragging ? " is-dragging" : ""}${busy ? " is-disabled" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-describedby="resume-upload-help resume-upload-error"
        >
          <input
            type="file"
            multiple
            accept=".pdf,.txt,application/pdf,text/plain"
            disabled={busy}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <UploadCloud size={23} />
          <strong>{dragging ? "松开鼠标即可添加简历" : files.length > 0 ? `已选择 ${files.length} 份简历，可继续拖入追加` : "拖拽 PDF 或 TXT 简历到这里"}</strong>
          <span id="resume-upload-help">或点击选择文件 · 单份最大 10MB · 最多 10 份 · 扫描图片 PDF 暂不支持</span>
        </label>
        <p className="file-upload-error" id="resume-upload-error" role="alert">{fileError}</p>
        {files.length > 0 && <div className="selected-file-list" aria-label="已选择的简历">{files.map((file) => <div key={`${file.name}-${file.size}-${file.lastModified}`}><FileText size={15} /><span>{file.name}<small>{(file.size / 1024).toFixed(0)} KB</small></span><button type="button" onClick={() => removeFile(file)} disabled={busy} aria-label={`移除 ${file.name}`}><X size={14} /></button></div>)}</div>}
        <div className="or-divider"><span>也可添加一位文本候选人</span></div>
        <label className="paste-field"><span className="sr-only">粘贴简历文本</span><textarea disabled={busy} value={text} onChange={(event) => setText(event.target.value)} rows={6} placeholder="粘贴一位候选人的工作经历、项目、教育和技能……" /></label>
        <div className="real-card-footer"><span><FileText size={15} />服务端持久化队列 · 并发 2 · 刷新或重新打开后自动恢复</span><button className="button button-primary" disabled={!canRun || busy} onClick={() => onProcess(files, text)}>{busy ? <><LoaderCircle className="spin" size={16} />后台队列处理中</> : <><Users size={16} />创建解析任务</>}</button></div>
      </section>

      {candidates.length > 0 && <section className="batch-run-list" aria-live="polite">
        {candidates.map((candidate) => <article className={`batch-run-item ${candidate.status}`} key={candidate.id}>
          <span className="batch-status-icon">{candidate.status === "complete" ? <CheckCircle2 size={16} /> : candidate.status === "error" ? <CircleAlert size={16} /> : <LoaderCircle className={candidate.status === "queued" ? "" : "spin"} size={16} />}</span>
          <div><strong>{candidate.profile?.candidateName ?? candidate.sourceName}</strong><small>{statusLabel[candidate.status]}{candidate.attempts ? ` · 第 ${candidate.attempts}/${candidate.maxAttempts ?? 3} 次尝试` : ""}{candidate.error ? ` · ${candidate.error}` : ""}</small></div>
          {candidate.status === "complete" && <b>{candidate.match?.totalScore}</b>}
          {candidate.status === "error" && <button className="icon-button" type="button" onClick={() => onRetry(candidate.id)} disabled={busy} aria-label={`重试 ${candidate.sourceName}`}><RefreshCcw size={14} /></button>}
        </article>)}
      </section>}
    </div>
  );
}
