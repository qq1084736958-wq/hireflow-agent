"use client";

import { useState } from "react";
import { Activity, ArrowLeft, Check, CircleAlert, GraduationCap, LoaderCircle } from "lucide-react";
import type { TrainingBrief, TrainingMessage, TrainingPlan, TrainingRecord, TrainingRecordSnapshot, TrainingReport } from "@/lib/training/schemas";
import { TrainingContent } from "./training-content";
import { TrainingReportView } from "./training-report";
import { TrainingRoleplay } from "./training-roleplay";
import { TrainingSetup } from "./training-setup";
import { TrainingHistory } from "./training-history";

type TrainingStage = "setup" | "content" | "practice" | "report";
interface RunEvent { agent: string; action: string; detail: string }

async function readApi<T>(response: Response) {
  const payload = await response.json() as T & { error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : payload.error?.message || "Agent 请求失败。");
  return payload;
}

export function TrainingAgentFlow({ onBack, initialRecord }: { onBack: () => void; initialRecord?: TrainingRecordSnapshot }) {
  const [stage, setStage] = useState<TrainingStage>(initialRecord ? "report" : "setup");
  const [plan, setPlan] = useState<TrainingPlan | null>(initialRecord?.plan ?? null);
  const [messages, setMessages] = useState<TrainingMessage[]>(initialRecord?.messages ?? []);
  const [report, setReport] = useState<TrainingReport | null>(initialRecord?.report ?? null);
  const [brief, setBrief] = useState<TrainingBrief | null>(initialRecord?.brief ?? null);
  const [events, setEvents] = useState<RunEvent[]>(initialRecord ? [{ agent: "Training Archive", action: "历史报告已恢复", detail: `${initialRecord.brief.traineeName} · ${initialRecord.report.overallScore} 分` }] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<"saving" | "saved" | "error">(initialRecord ? "saved" : "saving");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  async function generateContent(brief: TrainingBrief) {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/training/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief) });
      const data = await readApi<{ plan: TrainingPlan; run: { agent: string; action: string; generatedModules: number } }>(response);
      setBrief(brief);
      setPlan(data.plan); setStage("content");
      setEvents([{ agent: data.run.agent, action: data.run.action, detail: `生成 ${data.run.generatedModules} 个培训模块和 1 个陪练场景` }]);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "培训内容生成失败。");
      return false;
    }
    finally { setBusy(false); }
  }

  function startPractice() {
    if (!plan) return;
    setMessages([{ role: "coach", content: plan.scenario.openingMessage }]);
    setStage("practice");
    setEvents((current) => [...current, { agent: "Roleplay Partner", action: "角色陪练已启动", detail: `AI 正在扮演：${plan.scenario.roleName}` }]);
  }

  async function sendMessage(content: string) {
    if (!plan) return;
    const nextMessages: TrainingMessage[] = [...messages, { role: "learner", content }];
    setMessages(nextMessages); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/training/roleplay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, messages: nextMessages }) });
      const data = await readApi<{ reply: string; behaviorTag: string; run: { agent: string; action: string; turns: number } }>(response);
      setMessages([...nextMessages, { role: "coach", content: data.reply }]);
      setEvents((current) => [...current, { agent: data.run.agent, action: data.run.action, detail: `完成第 ${nextMessages.filter((item) => item.role === "learner").length} 轮 · ${data.behaviorTag}` }]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "角色回复失败。"); }
    finally { setBusy(false); }
  }

  async function evaluatePractice() {
    if (!plan || !brief) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/training/evaluation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, messages }) });
      const data = await readApi<{ report: TrainingReport; run: { agent: string; action: string; evaluatedTurns: number } }>(response);
      setReport(data.report); setStage("report");
      setArchiveStatus("saving");
      setEvents((current) => [...current, { agent: data.run.agent, action: data.run.action, detail: `评估 ${data.run.evaluatedTurns} 轮学员表达，总分 ${data.report.overallScore}` }]);
      try {
        const saveResponse = await fetch("/api/training-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, plan, messages, report: data.report }) });
        await readApi<{ record: TrainingRecord }>(saveResponse);
        setArchiveStatus("saved");
        setHistoryRefreshKey((current) => current + 1);
      } catch {
        setArchiveStatus("error");
        setError("培训报告已生成，但自动归档失败。你仍然可以导出报告。");
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "对话评分失败。"); }
    finally { setBusy(false); }
  }

  function openRecord(snapshot: TrainingRecordSnapshot) {
    setBrief(snapshot.brief);
    setPlan(snapshot.plan);
    setMessages(snapshot.messages);
    setReport(snapshot.report);
    setArchiveStatus("saved");
    setError(null);
    setStage("report");
    setEvents([{ agent: "Training Archive", action: "历史报告已恢复", detail: `${snapshot.brief.traineeName} · ${snapshot.report.overallScore} 分` }]);
  }

  function restartTraining() {
    setStage("setup");
    setBrief(null);
    setPlan(null);
    setMessages([]);
    setReport(null);
    setEvents([]);
    setError(null);
    setArchiveStatus("saving");
  }

  const currentIndex = ["setup", "content", "practice", "report"].indexOf(stage);
  return <div className="real-flow-page training-flow-page">
    <header className="real-flow-header"><div className="workspace-title"><button className="icon-button" onClick={onBack} aria-label="返回招聘总览"><ArrowLeft size={18} /></button><span className="brand-mark"><GraduationCap size={17} /></span><div><p>TRAINING AGENT WORKFLOW</p><h1>企业培训与 AI 陪练</h1></div></div><div className="model-status configured"><span className="pulse" />DeepSeek Agent 已连接</div></header>
    <nav className="real-stepper training-stepper" aria-label="培训 Agent 流程">{[["setup","01","培训设计"],["content","02","内容生成"],["practice","03","角色陪练"],["report","04","培训报告"]].map(([id, number, label], index) => <span className={index === currentIndex ? "real-step active" : index < currentIndex ? "real-step complete" : "real-step"} key={id}><i>{index < currentIndex ? <Check size={13} /> : number}</i>{label}</span>)}</nav>
    <div className="real-flow-content">{error && <div className="error-alert" role="alert"><CircleAlert size={18} /><span><strong>Agent 没有完成这一步</strong><p>{error}</p></span></div>}<div className="real-flow-grid"><div>{stage === "setup" && <><TrainingSetup busy={busy} onSubmit={generateContent} /><TrainingHistory refreshKey={historyRefreshKey} onOpenRecord={openRecord} /></>}{stage === "content" && plan && <TrainingContent plan={plan} onStart={startPractice} />}{stage === "practice" && plan && <TrainingRoleplay plan={plan} messages={messages} busy={busy} onSend={sendMessage} onEvaluate={evaluatePractice} />}{stage === "report" && plan && report && brief && <TrainingReportView plan={plan} report={report} traineeName={brief.traineeName} archiveStatus={archiveStatus} onRestart={restartTraining} />}</div><aside className="live-run-panel"><div className="live-run-title"><Activity size={16} /><span><p>LIVE TRACE</p><h2>培训 Agent 记录</h2></span></div>{events.length === 0 ? <p className="run-empty">创建培训任务后，每个 Agent 节点的执行结果会显示在这里。</p> : events.map((event, index) => <div className="live-event" key={`${event.agent}-${index}`}><span><Check size={13} /></span><div><small>{event.agent}</small><strong>{event.action}</strong><p>{event.detail}</p></div></div>)}{busy && <div className="live-event running"><span><LoaderCircle className="spin" size={13} /></span><div><small>RUNNING</small><strong>Agent 正在处理</strong><p>等待 DeepSeek 返回结构化结果…</p></div></div>}</aside></div></div>
  </div>;
}
