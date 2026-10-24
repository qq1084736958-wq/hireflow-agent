import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Crown,
  FileSearch,
  RefreshCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { JobAnalysis } from "@/lib/agent/schemas";
import type { HrDecisionReason, HrDecisionStatus } from "@/lib/projects/schema";
import {
  getCandidateInterviewStatus,
  getInterviewProgress,
  sortCompletedCandidates,
  type CandidateRun,
} from "./real-candidate-types";

interface RealCandidateRankingProps {
  job: JobAnalysis;
  candidates: CandidateRun[];
  selectedId: string | null;
  busy: boolean;
  onJobChange: (job: JobAnalysis) => void;
  onScoreChange: (candidateId: string, requirementId: string, score: number) => void;
  onDecision: (candidateId: string, status: HrDecisionStatus, reason: HrDecisionReason, note: string) => void;
  onSelect: (candidateId: string) => void;
  onRetry: (candidateId: string) => void;
  onStartInterview: (candidate: CandidateRun) => void;
}

const decisionLabels: Record<HrDecisionStatus, string> = {
  pending: "待 HR 确认",
  shortlisted: "进入下一轮",
  hold: "暂缓",
  rejected: "淘汰",
};
const decisionReasons: HrDecisionReason[] = [
  "核心能力符合",
  "需要补充面试",
  "薪酬期望待确认",
  "工作地点或出勤安排待确认",
  "入职时间待确认",
  "关键经验不足",
  "业务优先级调整",
  "其他",
];

function EvidenceAudit({ candidate, busy, weightsValid, onScoreChange }: {
  candidate: CandidateRun;
  busy: boolean;
  weightsValid: boolean;
  onScoreChange: (candidateId: string, requirementId: string, score: number) => void;
}) {
  const [openRequirementId, setOpenRequirementId] = useState<string | null>(null);

  return <section className="ranking-evidence-audit">
    <div><h4>评分依据与原文核验</h4><span>引用由程序定位；修改单项分后自动重算</span></div>
    {candidate.match?.matches.map((item) => {
      const isOpen = openRequirementId === item.requirementId;
      const verification = item.evidenceVerification ?? "no_evidence";
      const verificationLabel = verification === "verified" ? "原文已定位" : verification === "not_found" ? "引用未找到" : "无直接证据";
      const location = item.evidenceLocation;
      const contextStart = location ? Math.max(0, location.start - 160) : 0;
      const contextEnd = location ? Math.min(candidate.resumeText?.length ?? 0, location.end + 160) : Math.min(candidate.resumeText?.length ?? 0, 500);
      const sourceText = candidate.resumeText ?? "";
      return <article key={item.requirementId}>
        <span><strong>{item.label}</strong><small>{item.evidenceSource || "来源未提供"} · {item.scoreSource ?? "AI评分"}</small></span>
        <span className="evidence-proof-cell">
          <q>{item.evidenceQuote || "简历中未找到直接证据"}</q>
          <span><em className={`evidence-verification ${verification}`}>{verificationLabel}</em><button type="button" onClick={() => setOpenRequirementId(isOpen ? null : item.requirementId)}><FileSearch size={12} />{isOpen ? "收起原文" : "查看原文"}</button></span>
        </span>
        <label><span className="sr-only">{item.label}单项得分</span><input type="number" min="0" max="100" value={item.score} disabled={busy || !weightsValid} onChange={(event) => onScoreChange(candidate.id, item.requirementId, Number(event.target.value))} /><b>分</b></label>
        {isOpen && <div className={`evidence-source-context ${verification}`}>
          <strong>{verification === "verified" ? "脱敏简历原文中的对应位置" : verification === "not_found" ? "未能在脱敏简历中定位该引用" : "该能力没有可引用的直接证据"}</strong>
          {sourceText ? <p>{sourceText.slice(contextStart, location?.start ?? contextStart)}{location && <mark>{sourceText.slice(location.start, location.end)}</mark>}{sourceText.slice(location?.end ?? contextStart, contextEnd)}</p> : <p>没有可显示的脱敏简历文本。</p>}
          {verification !== "verified" && <small>该项已自动降为“待验证”，AI 分数最高 30 分，需要 HR 在面试中补充核实。</small>}
        </div>}
      </article>;
    })}
  </section>;
}

function HrDecisionEditor({ candidate, busy, onDecision }: {
  candidate: CandidateRun;
  busy: boolean;
  onDecision: (candidateId: string, status: HrDecisionStatus, reason: HrDecisionReason, note: string) => void;
}) {
  const [status, setStatus] = useState<HrDecisionStatus>(candidate.hrDecision?.status ?? "pending");
  const [reason, setReason] = useState<HrDecisionReason>(candidate.hrDecision?.reason ?? "需要补充面试");
  const [note, setNote] = useState(candidate.hrDecision?.note ?? "");

  return <section className="hr-decision-panel">
    <div className="hr-decision-heading">
      <span><strong>HR 最终决策</strong><small>AI 分数仅作辅助，不会自动推进或淘汰候选人。</small></span>
      <em className={`hr-decision-pill ${candidate.hrDecision?.status ?? "pending"}`}>{decisionLabels[candidate.hrDecision?.status ?? "pending"]}</em>
    </div>
    <div className="hr-decision-form">
      <label><span>业务动作</span><select value={status} onChange={(event) => setStatus(event.target.value as HrDecisionStatus)} disabled={busy}>{Object.entries(decisionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>决策原因</span><select value={reason} onChange={(event) => setReason(event.target.value as HrDecisionReason)} disabled={busy}>{decisionReasons.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <label className="full"><span>人工备注（可选）</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1_000} rows={3} placeholder="记录薪酬、出勤安排、入职时间或其他需要后续确认的业务信息……" disabled={busy} /></label>
    </div>
    <div className="hr-decision-actions">
      <small>只记录与岗位直接相关的信息；不得根据家庭住址、年龄、性别等受保护或非必要信息作出推断。</small>
      <button className="button button-secondary" type="button" disabled={busy} onClick={() => onDecision(candidate.id, status, reason, note)}>保存人工决策</button>
    </div>
    {(candidate.hrDecision?.history.length ?? 0) > 0 && <details className="hr-decision-history"><summary>查看决策记录（{candidate.hrDecision?.history.length}）</summary>{candidate.hrDecision?.history.slice().reverse().map((entry) => <p key={`${entry.decidedAt}-${entry.status}`}><strong>{decisionLabels[entry.status]} · {entry.reason}</strong><span>{new Date(entry.decidedAt).toLocaleString("zh-CN")} · {entry.actor}{entry.note ? ` · ${entry.note}` : ""}</span></p>)}</details>}
  </section>;
}

export function RealCandidateRanking({ job, candidates, selectedId, busy, onJobChange, onScoreChange, onDecision, onSelect, onRetry, onStartInterview }: RealCandidateRankingProps) {
  const ranked = sortCompletedCandidates(candidates);
  const selected = ranked.find((item) => item.id === selectedId) ?? ranked[0];
  const failed = candidates.filter((item) => item.status === "error");
  const progress = getInterviewProgress(candidates);
  const totalWeight = job.requirements.reduce((sum, item) => sum + item.weight, 0);
  const weightsValid = totalWeight === 100;
  const selectedInterviewStatus = selected ? getCandidateInterviewStatus(selected) : "not_started";
  const canOpenInterview = selectedInterviewStatus === "completed"
    || selectedInterviewStatus === "in_progress"
    || selected?.hrDecision?.status === "shortlisted";

  function updateWeight(requirementId: string, weight: number) {
    onJobChange({
      ...job,
      requirements: job.requirements.map((item) => item.id === requirementId
        ? { ...item, weight: Math.min(100, Math.max(0, weight)) }
        : item),
    });
  }

  return (
    <div className="real-stack">
      <section className="real-card ranking-card">
        <header className="real-card-heading"><span className="real-card-icon"><Users size={19} /></span><div><p>STEP 03 · CANDIDATE RANKING</p><h2>{job.title} · 候选人排名</h2><span>所有候选人使用同一岗位权重评分；排序仅提供决策辅助，不自动淘汰候选人。</span></div></header>
        <details className="ranking-weight-editor">
          <summary><span><SlidersHorizontal size={15} /><strong>调整岗位权重并自动重算排名</strong></span><em className={weightsValid ? "valid" : "invalid"}>{totalWeight}%</em></summary>
          <div>{job.requirements.map((item) => <label key={item.id}><span><strong>{item.label}</strong><small>{item.kind}</small></span><span><input type="number" min="0" max="100" value={item.weight} disabled={busy} onChange={(event) => updateWeight(item.id, Number(event.target.value))} />%</span></label>)}</div>
          <p>{weightsValid ? "权重有效；修改后候选人总分和排序由程序立即重算。" : "权重必须合计 100%；当前排名暂不重算，也不能开始面试。"}</p>
        </details>
        <div className="ranking-summary"><span><strong>{ranked.length}</strong><small>进入排名</small></span><span><strong>{progress.completed}</strong><small>面试完成</small></span><span><strong>{failed.length}</strong><small>需要重试</small></span><p><Sparkles size={14} />{progress.completed}/{progress.total} 位已完成面试</p></div>
        <div className="ranking-table" aria-label="候选人排名">
          {ranked.map((candidate, index) => {
            const coverage = Math.round(candidate.match.matches.filter((item) => item.status !== "待验证").length / candidate.match.matches.length * 100);
            const interviewStatus = getCandidateInterviewStatus(candidate);
            const statusLabel = interviewStatus === "completed" ? "报告已生成" : interviewStatus === "in_progress" ? "面试进行中" : interviewStatus === "skipped" ? "已跳过" : "待面试";
            return (
              <button className={candidate.id === selected?.id ? "ranking-row selected" : "ranking-row"} type="button" key={candidate.id} onClick={() => onSelect(candidate.id)}>
                <span className="ranking-position">{index === 0 ? <Crown size={16} /> : index + 1}</span>
                <span className="avatar">{candidate.profile.candidateName.slice(0, 1)}</span>
                <span className="ranking-person"><strong>{candidate.profile.candidateName}</strong><small>{candidate.profile.headline}</small><em className={`hr-decision-pill ${candidate.hrDecision?.status ?? "pending"}`}>HR：{decisionLabels[candidate.hrDecision?.status ?? "pending"]}</em></span>
                <span className={`candidate-interview-status ${interviewStatus}`}>{statusLabel}</span>
                <span className="ranking-coverage"><strong>{coverage}%</strong><small>证据覆盖</small></span>
                <span className="ranking-score"><strong>{candidate.match.totalScore}</strong><small>{candidate.match.recommendation}</small></span>
                <ArrowRight size={15} />
              </button>
            );
          })}
        </div>
        {failed.length > 0 && <div className="ranking-failures"><h3><CircleAlert size={15} />未完成的简历</h3>{failed.map((candidate) => <div key={candidate.id}><span><strong>{candidate.sourceName}</strong><small>{candidate.error}</small></span><button className="button button-secondary" type="button" onClick={() => onRetry(candidate.id)} disabled={busy}><RefreshCcw size={14} />重试</button></div>)}</div>}
      </section>

      {selected && <section className="real-card ranking-detail">
        <header><div><span className="avatar avatar-large">{selected.profile.candidateName.slice(0, 1)}</span><span><p>当前选择</p><h3>{selected.profile.candidateName}</h3><small>{selected.profile.headline}</small></span></div><span className="real-total-score"><strong>{selected.match.totalScore}</strong><small>人岗匹配</small></span></header>
        <div className="real-recommendation"><CheckCircle2 size={20} /><span><strong>{selected.match.recommendation}</strong><p>{selected.match.summary}</p></span></div>
        <HrDecisionEditor key={`${selected.id}-${selected.hrDecision?.decidedAt ?? "new"}`} candidate={selected} busy={busy} onDecision={onDecision} />
        {(selected.match.guardrailReasons?.length ?? 0) > 0 && <div className="score-guardrail-alert"><ShieldAlert size={19} /><span><strong>核心能力保护已触发 · 总分封顶 {selected.match.scoreCap}</strong><p>原始加权分 {selected.match.rawScore ?? selected.match.totalScore}；{selected.match.guardrailReasons?.join("；")}</p></span></div>}
        <div className="ranking-insights"><section><h4>核心优势</h4>{selected.match.strengths.slice(0, 3).map((item) => <p key={item}><CheckCircle2 size={14} />{item}</p>)}</section><section><h4>待验证项</h4>{[...selected.match.gaps, ...selected.match.risks].slice(0, 3).map((item) => <p key={item}><TriangleAlert size={14} />{item}</p>)}</section></div>
        <EvidenceAudit key={selected.id} candidate={selected} busy={busy} weightsValid={weightsValid} onScoreChange={onScoreChange} />
        <footer>
          <span>{selectedInterviewStatus === "completed" ? "该候选人的面试已完成，可随时查看独立报告。" : selectedInterviewStatus === "in_progress" ? "该候选人的面试已保存，可继续完成剩余问题。" : selected.hrDecision?.status === "shortlisted" ? "HR 已决定进入下一轮，可以生成定制面试题。" : selected.hrDecision?.status === "hold" ? "候选人已暂缓；补充信息后可重新修改人工决策。" : selected.hrDecision?.status === "rejected" ? "候选人流程已结束；如需恢复，请先修改人工决策。" : "请先保存 HR 最终决策，再进入后续面试流程。"}</span>
          <button className="button button-primary" type="button" onClick={() => onStartInterview(selected)} disabled={busy || !weightsValid || !canOpenInterview}>
            {selectedInterviewStatus === "completed" ? "查看面试报告" : selectedInterviewStatus === "in_progress" ? "继续面试" : selected.hrDecision?.status === "shortlisted" ? "开始面试" : "等待 HR 决策"}
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>}
    </div>
  );
}
