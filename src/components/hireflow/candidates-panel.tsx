import { ArrowRight, CheckCircle2, ChevronRight, FileText, MapPin, Sparkles, TriangleAlert } from "lucide-react";
import { candidates } from "@/lib/demo-data";
import type { Candidate } from "@/lib/types";

interface CandidatesPanelProps {
  selectedCandidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  onContinue: () => void;
}

export function CandidatesPanel({ selectedCandidate, onSelect, onContinue }: CandidatesPanelProps) {
  return (
    <section>
      <div className="content-heading content-heading-row">
        <div><p className="eyebrow">MATCH RESULTS</p><h2>候选人匹配排名</h2><p>共 3 位候选人完成解析。总分由程序按已确认权重计算。</p></div>
        <button className="button button-primary" onClick={onContinue}>为 {selectedCandidate.name} 准备面试 <ArrowRight size={17} /></button>
      </div>

      <div className="candidate-layout">
        <div className="candidate-list" role="list" aria-label="候选人排名">
          {candidates.map((candidate, index) => (
            <button
              className={candidate.id === selectedCandidate.id ? "candidate-card selected" : "candidate-card"}
              key={candidate.id}
              onClick={() => onSelect(candidate)}
            >
              <span className="rank">0{index + 1}</span>
              <span className="avatar">{candidate.initials}</span>
              <span className="candidate-card-main">
                <span className="candidate-name"><strong>{candidate.name}</strong><em className={candidate.recommendation === "推荐面试" ? "recommendation positive" : "recommendation"}>{candidate.recommendation}</em></span>
                <small>{candidate.role}</small>
                <span className="candidate-meta"><span>{candidate.experience}</span><span><MapPin size={12} />{candidate.location}</span></span>
              </span>
              <span className="score-ring" style={{ "--score": `${candidate.score * 3.6}deg` } as React.CSSProperties}><strong>{candidate.score}</strong><small>匹配分</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>

        <article className="candidate-detail">
          <header className="detail-header">
            <div><span className="avatar avatar-large">{selectedCandidate.initials}</span><span><h3>{selectedCandidate.name}</h3><p>{selectedCandidate.role}</p></span></div>
            <button className="button button-secondary"><FileText size={16} />查看原简历</button>
          </header>
          <p className="candidate-summary"><Sparkles size={16} />{selectedCandidate.summary}</p>

          <div className="dimension-grid">
            {selectedCandidate.dimensions.map((dimension) => (
              <div className="dimension-item" key={dimension.label}>
                <span><small>{dimension.label}</small><strong>{dimension.score}</strong></span>
                <i><b style={{ width: `${dimension.score}%` }} /></i>
              </div>
            ))}
          </div>

          <div className="evidence-heading"><h4>关键证据</h4><span>{selectedCandidate.mustHaveRate}% 必备项满足</span></div>
          <div className="evidence-list">
            {selectedCandidate.evidence.map((item) => (
              <div className="evidence-item" key={item.requirement}>
                {item.status === "已满足" ? <CheckCircle2 className="text-success" size={17} /> : <TriangleAlert className="text-warning" size={17} />}
                <span><strong>{item.requirement}<em>{item.status}</em></strong><q>{item.quote}</q><small>{item.source} · {item.reasoning}</small></span>
              </div>
            ))}
          </div>

          <div className="gap-row"><strong>面试需验证</strong>{selectedCandidate.gaps.map((gap) => <span key={gap}>{gap}</span>)}</div>
        </article>
      </div>
    </section>
  );
}
