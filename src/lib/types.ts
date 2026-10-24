export type Stage = "requirements" | "candidates" | "interview" | "report";

export type MatchStatus = "已满足" | "部分满足" | "待验证" | "不满足";

export interface Requirement {
  id: string;
  label: string;
  detail: string;
  weight: number;
  kind: "必备" | "加分";
}

export interface DimensionScore {
  label: string;
  score: number;
}

export interface Evidence {
  requirement: string;
  status: MatchStatus;
  quote: string;
  source: string;
  reasoning: string;
}

export interface Candidate {
  id: string;
  name: string;
  initials: string;
  role: string;
  experience: string;
  education: string;
  location: string;
  score: number;
  mustHaveRate: number;
  recommendation: "推荐面试" | "待人工确认" | "暂不推荐";
  summary: string;
  strengths: string[];
  gaps: string[];
  dimensions: DimensionScore[];
  evidence: Evidence[];
}

export interface InterviewQuestion {
  id: string;
  type: string;
  skill: string;
  question: string;
  rationale: string;
  answer?: string;
  evaluation?: string;
  score?: number;
}

export interface AgentEvent {
  id: string;
  agent: string;
  action: string;
  detail: string;
  duration: string;
  status: "完成" | "等待确认";
}
