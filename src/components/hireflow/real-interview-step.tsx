"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Keyboard,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import type { InterviewQuestion, ResumeProfile } from "@/lib/agent/schemas";

interface RealInterviewStepProps {
  resume: ResumeProfile;
  questions: InterviewQuestion[];
  answers: Record<string, string>;
  answerSources: Record<string, "manual" | "simulated">;
  busy: boolean;
  onBack: () => void;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSimulate: () => void;
  onEvaluate: () => void;
}

export function RealInterviewStep({
  resume,
  questions,
  answers,
  answerSources,
  busy,
  onBack,
  onAnswerChange,
  onSimulate,
  onEvaluate,
}: RealInterviewStepProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputMode, setInputMode] = useState<"record" | "simulation">(() => {
    const sources = Object.values(answerSources);
    return sources.length > 0 && sources.every((source) => source === "simulated") ? "simulation" : "record";
  });
  const question = questions[activeIndex];
  const completed = questions.filter((item) => (answers[item.id] ?? "").trim().length > 0).length;
  const allCompleted = completed === questions.length;
  const currentAnswer = (answers[question.id] ?? "").trim();
  const currentSource = answerSources[question.id];
  const hasAnyAnswer = completed > 0;
  const expectedSource = inputMode === "simulation" ? "simulated" : "manual";
  const modeSourcesReady = questions.every((item) => answerSources[item.id] === expectedSource);
  const confidenceLabel = currentAnswer.length < 20 ? "证据较少 · 低置信度" : currentAnswer.length < 60 ? "信息有限 · 中置信度" : "信息较充分 · 高置信度";

  return (
    <section className="real-card real-interview-card">
      <header className="real-card-heading">
        <span className="real-card-icon"><MessageSquareText size={19} /></span>
        <div>
          <p>STEP 04 · STRUCTURED INTERVIEW</p>
          <h2>{resume.candidateName} · 定制面试</h2>
          <span>问题来自岗位要求、简历证据以及仍需验证的能力缺口。</span>
        </div>
      </header>

      <div className="real-interview-layout">
        <aside className="real-question-rail" aria-label="面试问题列表">
          <div className="real-question-progress">
            <span><strong>{completed}</strong> / {questions.length} 已完成</span>
            <i><b style={{ width: `${Math.max(4, completed / questions.length * 100)}%` }} /></i>
          </div>
          {questions.map((item, index) => {
            const done = (answers[item.id] ?? "").trim().length > 0;
            return (
              <button
                type="button"
                className={activeIndex === index ? "real-question-link active" : "real-question-link"}
                key={item.id}
                onClick={() => setActiveIndex(index)}
                aria-current={activeIndex === index ? "step" : undefined}
              >
                <span>{done ? <CheckCircle2 size={14} /> : index + 1}</span>
                <span><strong>{item.type}</strong><small>{item.skill}</small></span>
              </button>
            );
          })}
        </aside>

        <div className="real-interview-stage">
          <div className="interview-mode-heading">
            <span><strong>选择本次面试的回答来源</strong><small>本版不开放候选人登录、摄像头或自助作答；真实面试由 HR / 面试官记录回答。</small></span>
          </div>
          <div className="interview-input-modes" role="group" aria-label="回答录入方式">
            <button
              className={inputMode === "record" ? "input-mode primary active" : "input-mode primary"}
              type="button"
              aria-pressed={inputMode === "record"}
              onClick={() => setInputMode("record")}
              disabled={busy}
            >
              <Keyboard size={17} />
              <span><strong>真实面试记录 <em>默认</em></strong><small>HR / 面试官提问并录入候选人的真实回答，随后由 AI 辅助评分。</small></span>
            </button>
            <button
              className={inputMode === "simulation" ? "input-mode demo active" : "input-mode demo"}
              type="button"
              aria-pressed={inputMode === "simulation"}
              onClick={() => setInputMode("simulation")}
              disabled={busy}
            >
              <Bot size={17} />
              <span><strong>AI 模拟演示</strong><small>AI 根据脱敏简历扮演候选人，仅用于作品集演示，不代表真实能力。</small></span>
            </button>
          </div>
          <div className={inputMode === "simulation" ? "interview-mode-notice simulation" : "interview-mode-notice record"}>
            {inputMode === "simulation" ? <Bot size={15} /> : <Keyboard size={15} />}
            <span>
              <strong>{inputMode === "simulation" ? "当前为作品集演示模式" : "当前为真实面试记录模式"}</strong>
              <small>{inputMode === "simulation"
                ? "点击“AI 生成全部模拟回答”后才会填充输入框；报告会持续标注为模拟数据。"
                : "请把候选人的现场回答录入下方输入框；短回答也允许提交，但评分置信度会降低。"}</small>
            </span>
          </div>
          <article className="question-card real-question-card">
            <div className="question-meta"><span>{question.type}</span><span>考察：{question.skill}</span></div>
            <h3>{question.question}</h3>
            <p><Sparkles size={15} />出题原因：{question.rationale}</p>
          </article>
          <label className="real-answer-field" htmlFor={`answer-${question.id}`}>
            <span>
              {inputMode === "simulation" ? "AI 模拟回答（只读）" : "候选人真实回答（由 HR / 面试官记录）"}
              {currentAnswer.length > 0 && <em className={`answer-source ${currentSource ?? "unknown"}`}>{currentSource === "simulated" ? "AI 演示回答" : currentSource === "manual" ? "HR 记录" : "来源未记录"}</em>}
            </span>
            <textarea
              id={`answer-${question.id}`}
              value={answers[question.id] ?? ""}
              onChange={(event) => onAnswerChange(question.id, event.target.value)}
              placeholder={inputMode === "simulation"
                ? "点击下方“AI 生成全部模拟回答”后，这里会显示基于简历事实生成的演示内容。"
                : "记录候选人的真实回答。回答较短也可以提交，AI 会降低结论置信度并建议继续追问……"}
              readOnly={inputMode === "simulation"}
              disabled={busy}
            />
            <small className={currentAnswer.length > 0 && currentAnswer.length < 20 ? "low-confidence" : ""}>
              {currentAnswer.length} 字符 · {currentAnswer.length === 0 ? "填写后可评分" : confidenceLabel}
            </small>
          </label>
          {allCompleted && !modeSourcesReady && <p className="interview-source-guidance">
            {inputMode === "simulation"
              ? "当前内容不是完整的 AI 模拟回答。请先生成全部模拟回答，系统才会开放演示评分。"
              : "部分回答仍是模拟数据或旧存档。请逐题确认并编辑为真实面试记录后再评分。"}
          </p>}
          <div className="real-interview-actions">
            <button className="button button-secondary" type="button" onClick={onBack} disabled={busy}>
              <Users size={15} />返回候选人列表
            </button>
            {inputMode === "simulation" && <button className="button button-secondary simulation-action" type="button" onClick={onSimulate} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={15} /> : <Bot size={15} />}
              {hasAnyAnswer ? "AI 重新生成全部模拟回答（覆盖）" : "AI 生成全部模拟回答"}
            </button>}
            <button className="button button-primary" type="button" onClick={onEvaluate} disabled={busy || !allCompleted || !modeSourcesReady}>
              <FileText size={15} />
              {inputMode === "simulation" ? "评分并生成演示报告" : "基于真实回答评分并生成报告"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
