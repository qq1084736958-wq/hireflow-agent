import { ArrowRight, CheckCircle2, FileCheck2, Link2, RotateCcw, TriangleAlert } from "lucide-react";
import type { JobAnalysis, MatchResult, ResumeProfile } from "@/lib/agent/schemas";

export function RealMatchResult({ job, resume, match, busy, onStartInterview }: { job: JobAnalysis; resume: ResumeProfile; match: MatchResult; busy: boolean; onStartInterview: () => void }) {
  return (
    <section className="real-card match-output">
      <header className="match-output-header"><div><span className="avatar avatar-large">{resume.candidateName.slice(0, 1)}</span><span><p>真实 Agent 匹配结果</p><h2>{resume.candidateName}</h2><small>{resume.headline} → {job.title}</small></span></div><span className="real-total-score"><strong>{match.totalScore}</strong><small>程序计算总分</small></span></header>
      <div className="real-recommendation"><FileCheck2 size={20} /><span><strong>{match.recommendation}</strong><p>{match.summary}</p></span></div>
      <div className="real-result-lists"><section><h3>核心优势</h3>{match.strengths.map((item) => <p key={item}><CheckCircle2 size={15} />{item}</p>)}</section><section><h3>差距与风险</h3>{[...match.gaps, ...match.risks].map((item) => <p key={item}><TriangleAlert size={15} />{item}</p>)}</section></div>
      <div className="real-evidence-heading"><h3>逐项证据映射</h3><span><Link2 size={14} />模型判断分项，程序计算总分</span></div>
      <div className="real-evidence-list">{match.matches.map((item) => <article key={item.requirementId}><div className="evidence-score"><strong>{item.score}</strong><small>{item.status}</small></div><div><h4>{item.label}</h4><q>{item.evidenceQuote || "简历未提供直接证据"}</q><p>{item.reasoning}</p><small>{item.evidenceSource} · 建议追问：{item.interviewFocus}</small></div></article>)}</div>
      <footer className="match-output-footer"><span>结果不会自动淘汰候选人，最终判断由 HR 作出。</span><div className="match-footer-actions"><button className="button button-secondary" onClick={() => window.location.reload()}><RotateCcw size={15} />重新分析</button><button className="button button-primary" onClick={onStartInterview} disabled={busy}>生成面试题<ArrowRight size={16} /></button></div></footer>
    </section>
  );
}
