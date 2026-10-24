import { CheckCircle2, Download, FileCheck2, Link2, Printer, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Candidate } from "@/lib/types";

export function ReportPanel({ candidate }: { candidate: Candidate }) {
  return (
    <section>
      <div className="content-heading content-heading-row">
        <div><p className="eyebrow">INTERVIEW REPORT · V1</p><h2>{candidate.name} · 面试评估报告</h2><p>基于岗位模型 V1、简历证据和模拟面试回答生成。</p></div>
        <div className="report-actions"><button className="button button-secondary" onClick={() => window.print()}><Printer size={16} />打印</button><button className="button button-primary"><Download size={16} />导出报告</button></div>
      </div>

      <article className="report-sheet">
        <header className="report-header">
          <div><span className="avatar avatar-xlarge">{candidate.initials}</span><span><p>候选人评估报告</p><h3>{candidate.name}</h3><small>{candidate.role} · {candidate.experience}</small></span></div>
          <div className="report-score"><strong>{candidate.score}</strong><span><b>人岗匹配</b><small>证据覆盖 100%</small></span></div>
        </header>

        <div className="recommendation-banner"><CheckCircle2 size={24} /><span><strong>建议进入下一轮</strong><p>核心能力证据完整。建议由业务负责人重点验证企业级交付取舍与模型评估体系。</p></span><em>Human decision required</em></div>

        <div className="report-grid">
          <section><h4>核心优势</h4>{candidate.strengths.map((item) => <p className="report-point positive" key={item}><CheckCircle2 size={16} />{item}</p>)}</section>
          <section><h4>待验证与风险</h4>{candidate.gaps.map((item) => <p className="report-point warning" key={item}><TriangleAlert size={16} />{item}</p>)}</section>
        </div>

        <section className="report-section"><div className="report-section-title"><h4>能力评估</h4><span><Link2 size={14} />每项结论均可追溯</span></div>
          <div className="report-dimensions">{candidate.dimensions.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}</strong></div>)}</div>
        </section>

        <section className="report-section"><div className="report-section-title"><h4>面试表现摘要</h4><span>已完成 1 / 8 题</span></div>
          <div className="report-quote"><FileCheck2 size={19} /><span><strong>MVP 取舍能力 · 92 分</strong><p>回答能够说明首版边界、主动舍弃的范围和验证指标，体现了从问题到实验的完整思考。</p><small>证据：模拟回答 Q1 · 需在真实面试中再次验证</small></span></div>
        </section>

        <footer className="report-disclaimer"><ShieldCheck size={17} /><p>本报告由 AI 基于提供的材料生成，仅用于辅助招聘人员整理信息，不构成自动录用或淘汰决定。模拟回答不代表真实候选人能力。</p></footer>
      </article>
    </section>
  );
}
