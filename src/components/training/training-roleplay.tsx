"use client";

import { useState } from "react";
import { ArrowRight, Bot, LoaderCircle, Send, UserRound } from "lucide-react";
import type { TrainingMessage, TrainingPlan } from "@/lib/training/schemas";

export function TrainingRoleplay({ plan, messages, busy, onSend, onEvaluate }: { plan: TrainingPlan; messages: TrainingMessage[]; busy: boolean; onSend: (message: string) => void; onEvaluate: () => void }) {
  const [draft, setDraft] = useState("");
  const learnerTurns = messages.filter((item) => item.role === "learner").length;
  function submit() { if (draft.trim().length < 2 || busy) return; onSend(draft.trim()); setDraft(""); }

  return <section className="real-card training-chat-card">
    <header className="training-chat-header"><div><p>STEP 03 · AI ROLEPLAY</p><h2>与 {plan.scenario.roleName} 对话</h2><span>{plan.scenario.learnerGoal}</span></div><em>{learnerTurns} 轮学员表达</em></header>
    <div className="training-chat-messages" aria-live="polite">{messages.map((message, index) => <article className={`training-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "coach" ? <Bot size={15} /> : <UserRound size={15} />}</span><div><strong>{message.role === "coach" ? plan.scenario.roleName : "学员"}</strong><p>{message.content}</p></div></article>)}{busy && <article className="training-message coach pending"><span><LoaderCircle className="spin" size={15} /></span><div><strong>{plan.scenario.roleName}</strong><p>正在思考回应…</p></div></article>}</div>
    <div className="training-chat-input"><label htmlFor="practice-reply">你的回答</label><textarea id="practice-reply" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="输入你的回应，Enter 发送，Shift + Enter 换行……" disabled={busy} /><div><small>AI 会保持角色，不会在对话中直接给答案。</small><button className="button button-secondary" type="button" onClick={submit} disabled={draft.trim().length < 2 || busy}><Send size={15} />发送</button><button className="button button-primary" type="button" onClick={onEvaluate} disabled={learnerTurns < 1 || busy}>结束并评分<ArrowRight size={16} /></button></div></div>
  </section>;
}
