import type { AgentEvent, Candidate, InterviewQuestion, Requirement } from "./types";

export const demoJob = {
  title: "AI 产品经理",
  department: "智能产品中心",
  headcount: 1,
  location: "上海 · 混合办公",
  jd: "负责企业级 AI 产品从需求洞察、方案设计到上线迭代的完整流程；能够将大模型能力转化为稳定、可衡量的产品体验；与算法、工程和业务团队协作，推动产品落地。",
};

export const requirements: Requirement[] = [
  { id: "ai", label: "AI 产品落地", detail: "主导过至少一个大模型或智能化产品从 0 到 1 落地", weight: 30, kind: "必备" },
  { id: "product", label: "产品全流程", detail: "具备需求研究、方案设计、上线迭代和指标复盘经验", weight: 25, kind: "必备" },
  { id: "result", label: "业务成果", detail: "能用数据说明产品带来的效率、收入或体验改善", weight: 20, kind: "必备" },
  { id: "collab", label: "跨团队协作", detail: "能与算法、工程、设计和业务团队共同推进复杂项目", weight: 15, kind: "必备" },
  { id: "enterprise", label: "企业服务经验", detail: "理解 B2B 决策链、交付和客户成功场景", weight: 10, kind: "加分" },
];

export const candidates: Candidate[] = [
  {
    id: "lin-yao",
    name: "林瑶",
    initials: "LY",
    role: "高级产品经理 · 智能客服",
    experience: "6 年经验",
    education: "浙江大学 · 信息管理",
    location: "上海",
    score: 88,
    mustHaveRate: 92,
    recommendation: "推荐面试",
    summary: "AI 落地与跨团队推进证据完整，业务成果清晰；企业级复杂交付经验需要进一步验证。",
    strengths: ["完成 LLM 客服产品 0→1", "召回准确率提升 21%", "协调算法与交付团队"],
    gaps: ["大型企业采购链经验不明确", "缺少定价策略案例"],
    dimensions: [
      { label: "AI 产品落地", score: 92 },
      { label: "产品全流程", score: 90 },
      { label: "业务成果", score: 91 },
      { label: "跨团队协作", score: 86 },
      { label: "企业服务经验", score: 70 },
    ],
    evidence: [
      { requirement: "AI 产品落地", status: "已满足", quote: "主导智能客服 Copilot 从需求验证到正式上线，覆盖 8 个业务团队。", source: "工作经历 · 第 2 段", reasoning: "有明确的主导角色、完整阶段和真实使用范围。" },
      { requirement: "业务成果", status: "已满足", quote: "上线三个月后一次解决率提升 21%，人工转接量下降 18%。", source: "项目经历 · 第 1 段", reasoning: "成果有明确指标，并与产品目标直接相关。" },
      { requirement: "企业服务经验", status: "待验证", quote: "参与重点客户方案沟通与交付复盘。", source: "工作经历 · 第 4 段", reasoning: "有客户接触，但无法确认是否理解完整采购与决策链。" },
    ],
  },
  {
    id: "zhou-kai",
    name: "周恺",
    initials: "ZK",
    role: "产品负责人 · 协同办公",
    experience: "8 年经验",
    education: "同济大学 · 软件工程",
    location: "杭州",
    score: 82,
    mustHaveRate: 81,
    recommendation: "推荐面试",
    summary: "企业产品和商业化经验扎实，但 AI 项目主要处于功能接入层，需验证其模型理解与评估能力。",
    strengths: ["大型 B2B 产品经验", "续费率提升 12%", "管理 5 人产品团队"],
    gaps: ["缺少模型评估体系", "AI 项目深度有限"],
    dimensions: [
      { label: "AI 产品落地", score: 72 },
      { label: "产品全流程", score: 94 },
      { label: "业务成果", score: 85 },
      { label: "跨团队协作", score: 91 },
      { label: "企业服务经验", score: 95 },
    ],
    evidence: [
      { requirement: "AI 产品落地", status: "部分满足", quote: "推动会议纪要和智能搜索功能接入第三方大模型。", source: "项目经历 · 第 2 段", reasoning: "有 AI 功能上线，但未说明模型评估、数据策略或质量治理。" },
      { requirement: "企业服务经验", status: "已满足", quote: "负责 50–500 人规模客户产品线，参与重点客户续约方案。", source: "工作经历 · 第 1 段", reasoning: "用户规模与续约职责能证明企业服务经验。" },
    ],
  },
  {
    id: "chen-mo",
    name: "陈墨",
    initials: "CM",
    role: "数据产品经理 · 零售科技",
    experience: "5 年经验",
    education: "华东师范大学 · 统计学",
    location: "苏州",
    score: 76,
    mustHaveRate: 74,
    recommendation: "待人工确认",
    summary: "数据分析与行业理解突出，但简历对个人决策和最终业务影响描述较弱。",
    strengths: ["实验设计能力强", "零售行业经验", "指标体系完整"],
    gaps: ["个人主导范围模糊", "AI 产品经验较少", "成果缺少归因说明"],
    dimensions: [
      { label: "AI 产品落地", score: 65 },
      { label: "产品全流程", score: 80 },
      { label: "业务成果", score: 76 },
      { label: "跨团队协作", score: 78 },
      { label: "企业服务经验", score: 84 },
    ],
    evidence: [
      { requirement: "业务成果", status: "部分满足", quote: "参与门店补货模型产品化，缺货率下降约 9%。", source: "项目经历 · 第 1 段", reasoning: "成果可量化，但‘参与’无法说明候选人的个人贡献。" },
      { requirement: "AI 产品落地", status: "待验证", quote: "与算法团队共建销量预测和商品推荐能力。", source: "工作经历 · 第 3 段", reasoning: "涉及算法产品，但未体现大模型产品经历。" },
    ],
  },
];

export const interviewQuestions: InterviewQuestion[] = [
  { id: "q1", type: "经历深挖", skill: "AI 产品落地", question: "在智能客服 Copilot 项目中，你如何定义首个可上线版本？请说明你主动舍弃了什么。", rationale: "验证候选人是否真正承担产品取舍，而非只负责项目协调。", answer: "我先把目标限定为高频售后问题辅助回复，而不是全自动客服。首版舍弃多轮任务执行，只保留知识检索、答案生成和人工确认。我们用一次解决率与编辑率作为核心指标，两周灰度后再扩展场景。", evaluation: "回答给出了边界、舍弃项和验证指标，能证明候选人掌握 MVP 取舍。可继续追问首版编辑率基线。", score: 92 },
  { id: "q2", type: "能力验证", skill: "模型评估", question: "当离线评测得分提升，但客服团队反馈效果变差时，你会如何判断问题？", rationale: "JD 要求把模型能力转化为稳定体验，简历没有说明评估体系。" },
  { id: "q3", type: "差距验证", skill: "企业服务", question: "请讲一个重点客户的个性需求与你的标准产品路线冲突的例子。你最终如何决定？", rationale: "候选人接触过交付，但企业级产品取舍证据不足。" },
  { id: "q4", type: "行为问题", skill: "跨团队协作", question: "算法团队认为质量未达标，业务团队坚持按期上线时，你如何推动共同决策？", rationale: "验证其在目标冲突下的决策机制。" },
  { id: "q5", type: "经历深挖", skill: "业务成果", question: "一次解决率提升 21% 的结果中，哪些变化可以归因于产品，哪些可能来自运营或样本变化？", rationale: "验证候选人是否理解业务指标的归因边界。" },
  { id: "q6", type: "能力验证", skill: "数据策略", question: "如果上线初期只有少量高质量标注数据，你会如何设计产品与数据闭环？", rationale: "岗位要求将模型能力转化为稳定体验，需验证冷启动思路。" },
  { id: "q7", type: "差距验证", skill: "商业化", question: "如果要为这类 Copilot 制定企业版定价，你会先验证哪三个变量？", rationale: "简历缺少定价策略案例，需验证商业判断。" },
  { id: "q8", type: "行为问题", skill: "复盘能力", question: "讲一个你判断错误的产品决定。你从什么信号发现问题，又如何修正？", rationale: "验证候选人能否识别错误并形成可复用的方法。" },
];

export const agentEvents: AgentEvent[] = [
  { id: "e1", agent: "Job Analyst", action: "解析岗位要求", detail: "识别 5 项能力要求与 2 个待确认项", duration: "2.4s", status: "完成" },
  { id: "e2", agent: "Human checkpoint", action: "确认岗位模型", detail: "HR 调整权重后确认版本 V1", duration: "人工确认", status: "完成" },
  { id: "e3", agent: "Resume Analyst", action: "并行解析简历", detail: "3/3 份简历完成事实与证据提取", duration: "5.8s", status: "完成" },
  { id: "e4", agent: "Match Evaluator", action: "计算人岗匹配", detail: "生成 15 项维度评分与 7 个待验证点", duration: "4.1s", status: "完成" },
  { id: "e5", agent: "Interviewer", action: "准备结构化面试", detail: "已为林瑶生成 8 道定制问题", duration: "2.9s", status: "完成" },
  { id: "e6", agent: "Report Writer", action: "等待面试完成", detail: "完成全部问题后生成最终报告", duration: "—", status: "等待确认" },
];
