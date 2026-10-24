"use client";

import { useState } from "react";
import { ArrowRight, Bot, CheckCircle2, ChevronDown, MessageSquareText, Play, Sparkles } from "lucide-react";
import { interviewQuestions } from "@/lib/demo-data";
import type { Candidate } from "@/lib/types";

export function InterviewPanel({ candidate, onContinue }: { candidate: Candidate; onContinue: () => void }) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const question = interviewQuestions[activeQuestion];

  function simulate() {
    setSimulated(true);
  }

  return (
    <section>
      <div className="content-heading content-heading-row">
        <div><p className="eyebrow">STRUCTURED INTERVIEW</p><h2>{candidate.name} · 定制面试</h2><p>问题来自岗位要求、简历证据和仍需验证的信息。</p></div>
        <div className="mode-control"><span>回答模式</span><button>AI 模拟 · 普通水平 <ChevronDown size={15} /></button></div>
      </div>

      <div className="interview-layout">
        <aside className="question-rail">
          <div className="rail-progress"><span><strong>{simulated ? 1 : 0}</strong> / {interviewQuestions.length} 已完成</span><i><b style={{ width: simulated ? "12.5%" : "4%" }} /></i></div>
          {interviewQuestions.map((item, index) => (
            <button className={activeQuestion === index ? "question-link active" : "question-link"} key={item.id} onClick={() => { setActiveQuestion(index); setSimulated(Boolean(item.answer)); }}>
              <span>{item.answer && simulated ? <CheckCircle2 size={15} /> : index + 1}</span>
              <span><strong>{item.type}</strong><small>{item.skill}</small></span>
            </button>
          ))}
        </aside>

        <div className="interview-stage">
          <div className="simulation-warning"><Bot size={17} /><span><strong>演示模式</strong> · 以下回答由 AI 基于虚构简历模拟，不代表真实候选人能力。</span></div>
          <article className="question-card">
            <div className="question-meta"><span>{question.type}</span><span>考察：{question.skill}</span></div>
            <h3>{question.question}</h3>
            <p><Sparkles size={15} />出题原因：{question.rationale}</p>
          </article>

          {!simulated || !question.answer ? (
            <div className="answer-empty">
              <span className="empty-icon"><MessageSquareText size={24} /></span>
              <h3>准备模拟候选人回答</h3>
              <p>Agent 只会使用简历中已经存在的经历，不会创建新公司、项目或成果。</p>
              <button className="button button-primary" onClick={simulate}><Play size={16} />生成普通水平回答</button>
            </div>
          ) : (
            <div className="answer-result">
              <div className="speaker-row"><span className="avatar avatar-small">LY</span><span><strong>{candidate.name} · AI 模拟</strong><small>基于简历事实生成</small></span></div>
              <blockquote>{question.answer}</blockquote>
              <div className="evaluation-card">
                <span className="evaluation-score"><strong>{question.score}</strong><small>回答评分</small></span>
                <span><strong>Interview Evaluator</strong><p>{question.evaluation}</p></span>
              </div>
            </div>
          )}

          <div className="interview-actions">
            <button className="button button-secondary">编辑问题</button>
            <button className="button button-primary" onClick={onContinue} disabled={!simulated}>生成面试报告 <ArrowRight size={17} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
