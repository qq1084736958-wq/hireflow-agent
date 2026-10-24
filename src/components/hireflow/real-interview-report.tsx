import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Download,
  FileCheck2,
  Printer,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import type {
  InterviewQuestion,
  InterviewReport,
  JobAnalysis,
  MatchResult,
  ResumeProfile,
} from "@/lib/agent/schemas";

interface RealInterviewReportProps {
  job: JobAnalysis;
  resume: ResumeProfile;
  match: MatchResult;
  questions: InterviewQuestion[];
  answers: Record<string, string>;
  answerSources: Record<string, "manual" | "simulated">;
  report: InterviewReport;
  nextCandidateName: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function RealInterviewReport({ job, resume, match, questions, answers, answerSources, report, nextCandidateName, onBack, onNext }: RealInterviewReportProps) {
  const questionById = new Map(questions.map((item) => [item.id, item]));
  const simulatedCount = questions.filter((item) => answerSources[item.id] === "simulated").length;
  const unknownSourceCount = questions.filter((item) => !answerSources[item.id]).length;
  const sourceNeedsAttention = simulatedCount > 0 || unknownSourceCount > 0;

  function exportPdf() {
    const previousTitle = document.title;
    document.title = `${resume.candidateName}-${job.title}-面试报告`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 500);
  }

  return (
    <section className="real-report-wrap">
      <div className="real-report-toolbar">
        <div><p>INTERVIEW REPORT · LIVE</p><h2>{resume.candidateName} · 面试评估报告</h2></div>
        <div className="report-actions"><button className="button button-secondary" type="button" onClick={() => window.print()}><Printer size={15} />打印</button><button className="button button-primary" type="button" onClick={exportPdf}><Download size={15} />导出 PDF</button></div>
      </div>
      <div className={sourceNeedsAttention ? "report-source-notice simulated" : "report-source-notice"}>
        {sourceNeedsAttention ? <Bot size={17} /> : <FileCheck2 size={17} />}
        <span>
          <strong>{simulatedCount > 0 ? "报告包含 AI 演示回答" : unknownSourceCount > 0 ? "部分回答来源未记录" : "报告基于 HR 记录的真实回答"}</strong>
          <small>{simulatedCount > 0 ? `${simulatedCount}/${questions.length} 道回答为模拟数据，仅用于作品集演示，不能作为真实招聘结论。` : unknownSourceCount > 0 ? `${unknownSourceCount}/${questions.length} 道回答来自旧存档，无法确认是现场记录还是模拟数据，请勿直接用于招聘决策。` : "AI 评分用于辅助判断，最终决定仍需由 HR 与面试官完成。"}</small>
        </span>
      </div>
      <article className="report-sheet real-report-sheet">
        <header className="report-header">
          <div><span className="avatar avatar-xlarge">{resume.candidateName.slice(0, 1)}</span><span><p>候选人评估报告</p><h3>{resume.candidateName}</h3><small>{resume.headline} · 应聘 {job.title}</small></span></div>
          <div className="report-score"><strong>{report.overallScore}</strong><span><b>面试总分</b><small>人岗匹配 {match.totalScore} 分</small></span></div>
        </header>
        <div className="recommendation-banner">
          <FileCheck2 size={24} />
          <span><strong>{report.recommendation}</strong><p>{report.executiveSummary}</p></span>
          <em>Human decision required</em>
        </div>
        <div className="report-grid">
          <section><h4>核心优势</h4>{report.strengths.map((item) => <p className="report-point positive" key={item}><CheckCircle2 size={16} />{item}</p>)}</section>
          <section><h4>风险与后续验证</h4>{[...report.risks, ...report.followUps].map((item) => <p className="report-point warning" key={item}><TriangleAlert size={16} />{item}</p>)}</section>
        </div>
        <section className="report-section report-evidence-sources">
          <div className="report-section-title"><h4>风险判断的证据来源</h4><span>可追溯至简历与人工修正</span></div>
          {match.matches.filter((item) => item.status !== "已满足").map((item) => <article key={item.requirementId}>
            <span><strong>{item.label}</strong><small>{item.status} · {item.score} 分 · {item.scoreSource ?? "AI评分"}</small></span>
            <div><q>{item.evidenceQuote || "简历中未找到直接证据"}</q><small>来源：{item.evidenceSource || "未提供"} · 判断：{item.reasoning}</small></div>
          </article>)}
        </section>
        <section className="report-section">
          <div className="report-section-title"><h4>逐题面试表现</h4><span>{report.evaluations.length} / {questions.length} 题已评分</span></div>
          <div className="real-evaluation-list">
            {report.evaluations.map((item) => {
              const question = questionById.get(item.questionId);
              const answerLength = (answers[item.questionId] ?? "").trim().length;
              const confidence = answerLength < 20 ? "低置信度" : answerLength < 60 ? "中置信度" : "高置信度";
              const source = answerSources[item.questionId] === "simulated" ? "AI 演示回答" : answerSources[item.questionId] === "manual" ? "HR 记录" : "来源未记录";
              return (
                <article key={item.questionId}>
                  <span className="evaluation-score"><strong>{item.score}</strong><small>回答评分</small></span>
                  <div><h5>{question?.skill ?? "能力验证"}</h5><p>{question?.question}</p><strong>{item.feedback}</strong><small>STAR {item.starCompleteness} · 证据一致性 {item.evidenceConsistency} · 专业深度 {item.professionalDepth} · {source} · {confidence}</small></div>
                </article>
              );
            })}
          </div>
        </section>
        <footer className="report-disclaimer"><ShieldCheck size={17} /><span><strong>AI 辅助评估，不自动做录用决定</strong><p>报告基于当前 JD、简历和面试回答生成，最终判断应由 HR 与业务面试官共同完成。</p></span></footer>
      </article>
      <div className="real-report-end">
        <span>
          <strong>{nextCandidateName ? "当前候选人已完成" : "全部候选人已完成"}</strong>
          <small>{nextCandidateName ? `下一位：${nextCandidateName}` : "可返回候选人列表查看全部面试结果"}</small>
        </span>
        <div>
          <button className="button button-secondary" type="button" onClick={onBack}><Users size={15} />返回候选人列表</button>
          {nextCandidateName && <button className="button button-primary" type="button" onClick={onNext}>面试下一位：{nextCandidateName}<ArrowRight size={16} /></button>}
        </div>
      </div>
    </section>
  );
}
