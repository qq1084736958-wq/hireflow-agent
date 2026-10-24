import { CheckCircle2, Download, RotateCcw, Target, TriangleAlert } from "lucide-react";
import type { TrainingPlan, TrainingReport } from "@/lib/training/schemas";

export function TrainingReportView({ plan, report, traineeName, archiveStatus, onRestart }: { plan: TrainingPlan; report: TrainingReport; traineeName: string; archiveStatus: "saving" | "saved" | "error"; onRestart: () => void }) {
  function exportPdf() { const title = document.title; document.title = `${plan.title}-培训报告`; window.print(); window.setTimeout(() => { document.title = title; }, 500); }
  return <section className="training-report-wrap">
    <div className={`archive-status ${archiveStatus}`}><CheckCircle2 size={14} />{archiveStatus === "saved" ? `${traineeName} 的培训报告已自动归档` : archiveStatus === "error" ? "报告已生成，但自动归档失败" : "正在归档培训报告…"}</div>
    <div className="real-report-toolbar"><div><p>TRAINING REPORT · LIVE</p><h2>{plan.title} · 陪练报告</h2></div><button className="button button-primary" type="button" onClick={exportPdf}><Download size={15} />导出 PDF</button></div>
    <article className="report-sheet training-report-sheet"><header className="training-report-hero"><div><p>对话能力评估</p><h3>{report.recommendation}</h3><span>{report.summary}</span></div><strong>{report.overallScore}<small>综合得分</small></strong></header>
      <div className="report-grid"><section><h4>表现优势</h4>{report.strengths.map((item) => <p className="report-point positive" key={item}><CheckCircle2 size={15} />{item}</p>)}</section><section><h4>需要改进</h4>{report.improvements.map((item) => <p className="report-point warning" key={item}><TriangleAlert size={15} />{item}</p>)}</section></div>
      <section className="report-section">
        <div className="report-section-title"><h4>评分维度</h4><span>基于行动、对方反应与结果证据</span></div>
        <div className="training-dimensions">{report.dimensions.map((item) => <article key={item.label}>
          <span>
            <strong>{item.label}</strong>
            <span className="training-evidence-meta"><i>{item.evidenceStrength ?? "历史评分"}</i><i>置信度：{item.confidence ?? "未记录"}</i></span>
            <small>学员原话：{item.evidence}</small>
          </span>
          <span className="training-dimension-score"><b>{item.score}</b>{item.rawScore !== undefined && <small>模型原始分 {item.rawScore}</small>}</span>
          <p>{item.feedback}</p>
          {item.guardrailReason && <p className="training-score-guardrail">{item.guardrailReason}</p>}
          <details className="training-behavior-chain">
            <summary>查看行为证据链</summary>
            <dl>
              <div><dt>具体行动</dt><dd>{item.behaviorEvidence?.action ?? "历史报告未记录"}</dd></div>
              <div><dt>对方反应</dt><dd>{item.behaviorEvidence?.counterpartReaction ?? "历史报告未记录"}</dd></div>
              <div><dt>验证结果</dt><dd>{item.behaviorEvidence?.outcome ?? "历史报告未记录"}</dd></div>
            </dl>
          </details>
        </article>)}</div>
      </section>
      <section className="training-next-actions"><h4><Target size={16} />下一步行动</h4>{report.nextActions.map((item) => <p key={item}>{item}</p>)}</section>
    </article><div className="real-report-end"><button className="button button-secondary" type="button" onClick={onRestart}><RotateCcw size={15} />开始新的培训</button></div>
  </section>;
}
