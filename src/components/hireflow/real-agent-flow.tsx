"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Bot, Check, CircleAlert, LoaderCircle } from "lucide-react";
import type {
  InterviewAnswer,
  InterviewQuestion,
  InterviewReport,
  JobAnalysis,
  MatchResult,
  ResumeProfile,
} from "@/lib/agent/schemas";
import { applyEvidenceVerification, recalculateMatchResult } from "@/lib/agent/schemas";
import type { CreateProjectInput, HrDecisionReason, HrDecisionStatus, ProjectSnapshot, ProjectStage } from "@/lib/projects/schema";
import type { JobDraft } from "@/lib/projects/job-drafts";
import { redactSensitiveText } from "@/lib/privacy/redact-sensitive-text";
import { RealCandidateRanking } from "./real-candidate-ranking";
import {
  findNextInterviewCandidate,
  sortCompletedCandidates,
  type CandidateInterview,
  type CandidateRun,
} from "./real-candidate-types";
import { RealInterviewReport } from "./real-interview-report";
import { RealInterviewStep } from "./real-interview-step";
import { RealJobStep } from "./real-job-step";
import { RealResumeStep } from "./real-resume-step";

interface RunEvent { agent: string; action: string; detail: string }

interface ResumeBatchPayload {
  id: string;
  status: "queued" | "running" | "completed" | "completed_with_errors" | "failed";
  summary: { total: number; queued: number; processing: number; complete: number; failed: number };
  items: Array<{
    id: string;
    sourceName: string;
    status: "queued" | "processing" | "complete" | "failed";
    phase: "queued" | "parsing" | "matching" | "complete" | "error";
    attempts: number;
    maxAttempts: number;
    nextRetryAt: string | null;
    error: string | null;
    result: { profile: ResumeProfile; resumeText: string; match: MatchResult } | null;
  }>;
}

function candidatesFromBatch(batch: ResumeBatchPayload): CandidateRun[] {
  return batch.items.map((item) => ({
    id: item.id,
    sourceName: item.sourceName,
    file: null,
    pastedText: "",
    status: item.status === "complete"
      ? "complete"
      : item.status === "failed"
        ? "error"
        : item.phase === "matching"
          ? "matching"
          : item.status === "processing"
            ? "parsing"
            : "queued",
    profile: item.result?.profile,
    resumeText: item.result?.resumeText,
    match: item.result?.match,
    error: item.error ?? undefined,
    attempts: item.attempts,
    maxAttempts: item.maxAttempts,
    nextRetryAt: item.nextRetryAt,
  }));
}

function redactAnswerRecord(answers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, answer]) => [questionId, redactSensitiveText(answer).text]),
  );
}

function hydrateCandidates(project?: ProjectSnapshot): CandidateRun[] {
  return (project?.candidates ?? []).map((item) => ({
    ...item,
    match: item.match && project?.job
      ? recalculateMatchResult(project.job, applyEvidenceVerification(item.resumeText ?? "", item.match))
      : item.match,
    interview: item.interview ?? (
      item.id === project?.selectedCandidateId && (project?.questions.length ?? 0) > 0
        ? {
            status: project?.report ? "completed" : "in_progress",
            questions: project?.questions ?? [],
            answers: project?.answers ?? {},
            answerSources: Object.fromEntries((project?.questions ?? []).map((question) => [
              question.id,
              project?.events.some((event) => event.agent === "Candidate Simulator") ? "simulated" : "manual",
            ])),
            report: project?.report ?? null,
          }
        : undefined
    ),
    file: null,
    pastedText: "",
    status: item.status === "complete" ? "complete" : "error",
    error: item.status === "complete" ? item.error : item.error ?? "处理被中断，请重新上传该简历。",
  }));
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Agent 请求失败。");
  return payload;
}

export function RealAgentFlow({ onBack, initialProject, initialDraft }: { onBack: () => void; initialProject?: ProjectSnapshot; initialDraft?: JobDraft }) {
  const [projectId, setProjectId] = useState<string | null>(initialProject?.id ?? null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(initialProject ? "saved" : "idle");
  const [stage, setStage] = useState<ProjectStage>(initialProject?.stage ?? "job");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<"public-cloud" | "custom-gateway">("public-cloud");
  const [job, setJob] = useState<JobAnalysis | null>(initialProject?.job ?? null);
  const [resume, setResume] = useState<ResumeProfile | null>(initialProject?.resume ?? null);
  const [resumeText, setResumeText] = useState(initialProject?.resumeText ?? "");
  const [match, setMatch] = useState<MatchResult | null>(() => (
    initialProject?.match && initialProject.job
      ? recalculateMatchResult(initialProject.job, applyEvidenceVerification(initialProject.resumeText, initialProject.match))
      : initialProject?.match ?? null
  ));
  const [candidates, setCandidates] = useState<CandidateRun[]>(() => hydrateCandidates(initialProject));
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(initialProject?.selectedCandidateId ?? null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initialProject?.questions ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>(initialProject?.answers ?? {});
  const [answerSources, setAnswerSources] = useState<Record<string, "manual" | "simulated">>(() => {
    const selected = hydrateCandidates(initialProject).find((candidate) => candidate.id === initialProject?.selectedCandidateId);
    return selected?.interview?.answerSources ?? {};
  });
  const [report, setReport] = useState<InterviewReport | null>(initialProject?.report ?? null);
  const [events, setEvents] = useState<RunEvent[]>(initialProject?.events ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeBatchId, setResumeBatchId] = useState<string | null>(null);
  const [resumeBatchStatus, setResumeBatchStatus] = useState<ResumeBatchPayload["status"] | null>(null);
  const finalizedBatchRef = useRef<string | null>(null);
  const [jobDraft, setJobDraft] = useState({ title: initialDraft?.title ?? "", jd: initialDraft?.jd ?? "" });
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">(initialDraft ? "saved" : "idle");
  const draftIdRef = useRef<string | null>(initialDraft?.id ?? null);
  const draftSaveChainRef = useRef(Promise.resolve());

  useEffect(() => {
    fetch("/api/agent/config")
      .then((response) => response.json())
      .then((data: { configured: boolean; model: string | null; deploymentMode?: "public-cloud" | "custom-gateway" }) => {
        setConfigured(data.configured);
        setModelName(data.model);
        setDeploymentMode(data.deploymentMode ?? "public-cloud");
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (initialProject || stage !== "job" || jobDraft.title.trim().length + jobDraft.jd.trim().length === 0) return;
    const content = { title: jobDraft.title, jd: jobDraft.jd };
    const timer = window.setTimeout(() => {
      draftSaveChainRef.current = draftSaveChainRef.current.then(async () => {
        setDraftSaveState("saving");
        try {
          const currentId = draftIdRef.current;
          const response = await fetch(currentId ? `/api/job-drafts/${currentId}` : "/api/job-drafts", {
            method: currentId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(content),
          });
          if (!response.ok) throw new Error("草稿保存失败");
          const result = await response.json() as { draft: JobDraft };
          draftIdRef.current = result.draft.id;
          setDraftSaveState("saved");
        } catch {
          setDraftSaveState("error");
        }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [initialProject, jobDraft, stage]);

  const applyResumeBatch = useCallback((batch: ResumeBatchPayload) => {
    const nextCandidates = candidatesFromBatch(batch);
    setResumeBatchId(batch.id);
    setResumeBatchStatus(batch.status);
    setCandidates((current) => nextCandidates.map((next) => {
      const existing = current.find((item) => item.id === next.id);
      return { ...next, interview: existing?.interview, hrDecision: existing?.hrDecision };
    }));
    const terminal = batch.status === "completed" || batch.status === "completed_with_errors" || batch.status === "failed";
    setBusy(!terminal);
    if (!terminal || finalizedBatchRef.current === batch.id) return;
    finalizedBatchRef.current = batch.id;
    const ranked = sortCompletedCandidates(nextCandidates);
    if (ranked.length === 0) {
      setError("所有简历都未完成，请查看失败原因后单独重试。");
      return;
    }
    setSelectedCandidateId(ranked[0].id);
    setEvents((current) => [...current, {
      agent: "Durable Batch Orchestrator",
      action: "持久化简历队列处理完成",
      detail: `${batch.summary.complete} 位成功进入排名${batch.summary.failed > 0 ? `，${batch.summary.failed} 位可重试` : ""}`,
    }]);
    setStage("match");
  }, []);

  useEffect(() => {
    if (!projectId || !job || stage !== "resume" || resumeBatchId) return;
    let cancelled = false;
    fetch(`/api/agent/resume-batches?projectId=${encodeURIComponent(projectId)}`)
      .then((response) => readApi<{ batch: ResumeBatchPayload | null }>(response))
      .then(({ batch }) => {
        if (!cancelled && batch) applyResumeBatch(batch);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [applyResumeBatch, job, projectId, resumeBatchId, stage]);

  useEffect(() => {
    if (!resumeBatchId || resumeBatchStatus === "completed" || resumeBatchStatus === "completed_with_errors" || resumeBatchStatus === "failed") return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/agent/resume-batches/${resumeBatchId}`, { cache: "no-store" });
        const { batch } = await readApi<{ batch: ResumeBatchPayload }>(response);
        if (!cancelled) applyResumeBatch(batch);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "任务进度读取失败。");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyResumeBatch, resumeBatchId, resumeBatchStatus]);

  useEffect(() => {
    if (!projectId || !job) return;
    const snapshot: ProjectSnapshot = {
      id: projectId,
      title: job.title,
      stage,
      job,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        sourceName: candidate.sourceName,
        status: candidate.status,
        profile: candidate.profile,
        resumeText: candidate.resumeText,
        match: candidate.match,
        hrDecision: candidate.hrDecision,
        interview: candidate.interview ? {
          ...candidate.interview,
          answers: redactAnswerRecord(candidate.interview.answers),
        } : undefined,
        error: candidate.error,
      })),
      selectedCandidateId,
      resume,
      resumeText,
      match,
      questions,
      answers: redactAnswerRecord(answers),
      report,
      events,
    };
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        setSaveState(response.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, candidates, events, job, match, projectId, questions, report, resume, resumeText, selectedCandidateId, stage]);

  async function analyzeJob(title: string, jd: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, jd }),
      });
      const data = await readApi<{ analysis: JobAnalysis; run: { agent: string; action: string; sourceCharacters: number } }>(response);
      const firstEvent = { agent: data.run.agent, action: data.run.action, detail: `读取 ${data.run.sourceCharacters} 个字符，生成 ${data.analysis.requirements.length} 项要求` };
      setJob(data.analysis);
      setEvents([firstEvent]);
      setStage("resume");
      const projectInput: CreateProjectInput = {
        title: data.analysis.title,
        stage: "resume",
        job: data.analysis,
        candidates: [],
        selectedCandidateId: null,
        resume: null,
        resumeText: "",
        match: null,
        questions: [],
        answers: {},
        report: null,
        events: [firstEvent],
      };
      try {
        setSaveState("saving");
        const saveResponse = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectInput),
        });
        if (!saveResponse.ok) throw new Error("save failed");
        const saved = await saveResponse.json() as { project: { id: string } };
        setProjectId(saved.project.id);
        setSaveState("saved");
        if (draftIdRef.current) {
          await fetch(`/api/job-drafts/${draftIdRef.current}`, { method: "DELETE" });
          draftIdRef.current = null;
        }
      } catch {
        setSaveState("error");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "岗位解析失败。");
    } finally {
      setBusy(false);
    }
  }

  function updateJobModel(nextJob: JobAnalysis) {
    setJob(nextJob);
    const weightsValid = nextJob.requirements.reduce((sum, item) => sum + item.weight, 0) === 100;
    if (!weightsValid) return;

    setCandidates((current) => current.map((candidate) => (
      candidate.match ? { ...candidate, match: recalculateMatchResult(nextJob, candidate.match) } : candidate
    )));
    if (match) setMatch(recalculateMatchResult(nextJob, match));
  }

  function updateCandidateScore(candidateId: string, requirementId: string, score: number) {
    if (!job) return;
    const safeScore = Math.min(100, Math.max(0, score));
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate?.match) return;
    const updatedMatch: MatchResult = {
      ...candidate.match,
      matches: candidate.match.matches.map((item) => item.requirementId === requirementId
        ? { ...item, score: safeScore, scoreSource: "HR修正" }
        : item),
    };
    const recalculated = recalculateMatchResult(job, updatedMatch);
    setCandidates((current) => current.map((item) => item.id === candidateId ? { ...item, match: recalculated } : item));
    if (selectedCandidateId === candidateId) setMatch(recalculated);
  }

  function updateHrDecision(candidateId: string, status: HrDecisionStatus, reason: HrDecisionReason, note: string) {
    const decidedAt = new Date().toISOString();
    setCandidates((current) => current.map((candidate) => {
      if (candidate.id !== candidateId) return candidate;
      const historyEntry = { status, reason, note: note.trim(), decidedAt, actor: "HR" as const };
      return {
        ...candidate,
        hrDecision: {
          ...historyEntry,
          history: [...(candidate.hrDecision?.history ?? []), historyEntry].slice(-30),
        },
      };
    }));
    setEvents((current) => [...current, {
      agent: "Human Decision",
      action: "HR 最终决策已记录",
      detail: `${status === "shortlisted" ? "进入下一轮" : status === "hold" ? "暂缓" : status === "rejected" ? "淘汰" : "待确认"} · ${reason}`,
    }]);
  }

  function updateCandidateInterview(candidateId: string, patch: Partial<CandidateInterview>) {
    setCandidates((current) => current.map((item) => {
      if (item.id !== candidateId) return item;
      const interview = item.interview ?? { status: "not_started", questions: [], answers: {}, answerSources: {}, report: null };
      return { ...item, interview: { ...interview, ...patch } };
    }));
  }

  function loadCandidate(candidate: CandidateRun) {
    if (!candidate.profile || !candidate.resumeText || !candidate.match) return false;
    setSelectedCandidateId(candidate.id);
    setResume(candidate.profile);
    setResumeText(candidate.resumeText);
    setMatch(candidate.match);
    setQuestions(candidate.interview?.questions ?? []);
    setAnswers(candidate.interview?.answers ?? {});
    setAnswerSources(candidate.interview?.answerSources ?? {});
    setReport(candidate.interview?.report ?? null);
    return true;
  }

  async function processCandidates(files: File[], pastedText: string) {
    if (!job || !projectId) {
      setError("招聘项目尚未保存，请稍后重试。");
      return;
    }
    const textCandidate = pastedText.trim().length >= 80;
    const fileLimit = textCandidate ? 9 : 10;
    const initial: CandidateRun[] = files.slice(0, fileLimit).map((file) => ({ id: crypto.randomUUID(), sourceName: file.name, file, pastedText: "", status: "queued" }));
    if (textCandidate) initial.push({ id: crypto.randomUUID(), sourceName: "粘贴文本候选人", file: null, pastedText: pastedText.trim(), status: "queued" });
    if (initial.length === 0) return;

    setBusy(true);
    setError(null);
    setCandidates(initial);
    try {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("job", JSON.stringify(job));
      files.slice(0, fileLimit).forEach((file) => formData.append("files", file));
      if (textCandidate) formData.set("text", pastedText.trim());
      const response = await fetch("/api/agent/resume-batches", { method: "POST", body: formData });
      const { batch } = await readApi<{ batch: ResumeBatchPayload }>(response);
      finalizedBatchRef.current = null;
      applyResumeBatch(batch);
    } catch (requestError) {
      setBusy(false);
      setError(requestError instanceof Error ? requestError.message : "批处理任务创建失败。");
    }
  }

  async function retryCandidate(candidateId: string) {
    if (!resumeBatchId) {
      setError("该历史任务没有持久化队列记录，请重新上传这份简历。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent/resume-batches/${resumeBatchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: candidateId }),
      });
      const { batch } = await readApi<{ batch: ResumeBatchPayload }>(response);
      finalizedBatchRef.current = null;
      applyResumeBatch(batch);
    } catch (requestError) {
      setBusy(false);
      setError(requestError instanceof Error ? requestError.message : "重试任务创建失败。");
    }
  }

  async function generateInterview(candidate: CandidateRun) {
    if (!job || !candidate.profile || !candidate.resumeText || !candidate.match) return;
    loadCandidate(candidate);
    if (candidate.interview?.status === "completed" && candidate.interview.report) {
      setStage("report");
      return;
    }
    if (candidate.interview?.questions.length) {
      setStage("interview");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/generate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, resume: candidate.profile, match: candidate.match }),
      });
      const data = await readApi<{ questions: InterviewQuestion[]; run: { agent: string; action: string; generatedQuestions: number } }>(response);
      setQuestions(data.questions);
      setAnswers({});
      setAnswerSources({});
      setReport(null);
      updateCandidateInterview(candidate.id, {
        status: "in_progress",
        questions: data.questions,
        answers: {},
        answerSources: {},
        report: null,
      });
      setEvents((current) => [...current, { agent: data.run.agent, action: data.run.action, detail: `生成 ${data.run.generatedQuestions} 道证据驱动面试题` }]);
      setStage("interview");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "面试题生成失败。");
    } finally {
      setBusy(false);
    }
  }

  async function simulateInterview() {
    if (!resume || !resumeText || questions.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/simulate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, resumeText, questions }),
      });
      const data = await readApi<{ answers: InterviewAnswer[]; run: { agent: string; action: string; answeredQuestions: number } }>(response);
      const simulatedAnswers = Object.fromEntries(data.answers.map((item) => [item.questionId, item.answer]));
      const simulatedSources = Object.fromEntries(data.answers.map((item) => [item.questionId, "simulated" as const]));
      setAnswers(simulatedAnswers);
      setAnswerSources(simulatedSources);
      if (selectedCandidateId) updateCandidateInterview(selectedCandidateId, { status: "in_progress", answers: simulatedAnswers, answerSources: simulatedSources });
      setEvents((current) => [...current, { agent: data.run.agent, action: data.run.action, detail: `基于简历事实完成 ${data.run.answeredQuestions} 道模拟回答` }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "模拟回答生成失败。");
    } finally {
      setBusy(false);
    }
  }

  async function evaluateInterview() {
    if (!job || !resume || !match || questions.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const answerList = questions.map((item) => ({ questionId: item.id, answer: answers[item.id]?.trim() ?? "" }));
      const response = await fetch("/api/agent/evaluate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, resume, match, questions, answers: answerList, answerSources }),
      });
      const data = await readApi<{ report: InterviewReport; run: { agent: string; action: string; evaluatedAnswers: number } }>(response);
      setReport(data.report);
      if (selectedCandidateId) {
        updateCandidateInterview(selectedCandidateId, {
          status: "completed",
          questions,
          answers,
          answerSources,
          report: data.report,
        });
      }
      setEvents((current) => [...current, { agent: data.run.agent, action: data.run.action, detail: `完成 ${data.run.evaluatedAnswers} 道回答评分，总分 ${data.report.overallScore}` }]);
      setStage("report");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "面试评分失败。");
    } finally {
      setBusy(false);
    }
  }

  function handleAnswerChange(questionId: string, answer: string) {
    const nextAnswers = { ...answers, [questionId]: answer };
    const nextSources = { ...answerSources, [questionId]: "manual" as const };
    setAnswers(nextAnswers);
    setAnswerSources(nextSources);
    if (selectedCandidateId) updateCandidateInterview(selectedCandidateId, { status: "in_progress", answers: nextAnswers, answerSources: nextSources });
  }

  function returnToCandidates() {
    setError(null);
    setStage("match");
  }

  function interviewNextCandidate() {
    const nextCandidate = findNextInterviewCandidate(candidates, selectedCandidateId);
    if (nextCandidate) void generateInterview(nextCandidate);
    else setStage("match");
  }

  const currentIndex = ["job", "resume", "match", "interview", "report"].indexOf(stage);
  const nextInterviewCandidate = findNextInterviewCandidate(candidates, selectedCandidateId);

  return (
    <div className="real-flow-page">
      <header className="real-flow-header">
        <div className="workspace-title">
          <button className="icon-button" onClick={onBack} aria-label="返回招聘总览"><ArrowLeft size={18} /></button>
          <span className="brand-mark"><Bot size={17} /></span>
          <div><p>REAL AGENT WORKFLOW</p><h1>创建真实招聘分析</h1></div>
        </div>
        <div className="real-header-statuses">
          <div className={`save-status ${saveState}`}><span className="pulse" />{saveState === "saving" ? "正在保存" : saveState === "saved" ? "已保存" : saveState === "error" ? "保存失败" : "未创建项目"}</div>
          <div className={configured ? "model-status configured" : "model-status"}><span className="pulse" />{configured ? `${deploymentMode === "custom-gateway" ? "企业网关" : "公网 DeepSeek"} · ${modelName}` : "等待模型配置"}</div>
        </div>
      </header>

      <nav className="real-stepper" aria-label="真实 Agent 流程">
        {[["job", "01", "岗位解析"], ["resume", "02", "简历解析"], ["match", "03", "证据匹配"], ["interview", "04", "结构化面试"], ["report", "05", "面试报告"]].map(([id, number, label], index) => (
          <span className={index === currentIndex ? "real-step active" : index < currentIndex ? "real-step complete" : "real-step"} key={id}><i>{index < currentIndex ? <Check size={13} /> : number}</i>{label}</span>
        ))}
      </nav>

      <div className="real-flow-content">
        {configured === false && <div className="config-alert" role="status"><CircleAlert size={18} /><span><strong>需要配置 DeepSeek 才能运行真实链路</strong><p>复制 <code>.env.example</code> 为 <code>.env.local</code>，填写 <code>DEEPSEEK_API_KEY</code>，然后重启开发服务。默认模型为 deepseek-v4-flash。</p></span></div>}
        {error && <div className="error-alert" role="alert"><CircleAlert size={18} /><span><strong>Agent 没有完成这一步</strong><p>{error}</p></span></div>}

        <div className="real-flow-grid">
          <div>
            {stage === "job" && <RealJobStep busy={busy} title={jobDraft.title} jd={jobDraft.jd} draftState={draftSaveState} onChange={setJobDraft} onSubmit={analyzeJob} />}
            {stage === "resume" && job && <RealResumeStep job={job} candidates={candidates} busy={busy} deploymentMode={deploymentMode} onJobChange={updateJobModel} onProcess={processCandidates} onRetry={retryCandidate} />}
            {stage === "match" && job && <RealCandidateRanking job={job} candidates={candidates} selectedId={selectedCandidateId} busy={busy} onJobChange={updateJobModel} onScoreChange={updateCandidateScore} onDecision={updateHrDecision} onSelect={setSelectedCandidateId} onRetry={retryCandidate} onStartInterview={generateInterview} />}
            {stage === "interview" && resume && questions.length > 0 && <RealInterviewStep resume={resume} questions={questions} answers={answers} answerSources={answerSources} busy={busy} onBack={returnToCandidates} onAnswerChange={handleAnswerChange} onSimulate={simulateInterview} onEvaluate={evaluateInterview} />}
            {stage === "report" && job && resume && match && report && <RealInterviewReport job={job} resume={resume} match={match} questions={questions} answers={answers} answerSources={answerSources} report={report} nextCandidateName={nextInterviewCandidate?.profile?.candidateName ?? null} onBack={returnToCandidates} onNext={interviewNextCandidate} />}
          </div>
          <aside className="live-run-panel">
            <div className="live-run-title"><Activity size={16} /><span><p>LIVE TRACE</p><h2>Agent 执行记录</h2></span></div>
            {events.length === 0 ? <p className="run-empty">提交 JD 后，每个 Agent 节点的真实执行结果会显示在这里。</p> : events.map((event, index) => <div className="live-event" key={`${event.agent}-${index}`}><span><Check size={13} /></span><div><small>{event.agent}</small><strong>{event.action}</strong><p>{event.detail}</p></div></div>)}
            {busy && <div className="live-event running"><span><LoaderCircle className="spin" size={13} /></span><div><small>RUNNING</small><strong>模型正在处理</strong><p>等待结构化结果并执行 Schema 校验…</p></div></div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
