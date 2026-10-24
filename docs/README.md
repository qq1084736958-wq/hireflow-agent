# HireFlow · AI PM 作品集导航

> **项目**：HireFlow — 证据驱动的 AI 招聘决策工作台  
> **技术栈**：Next.js 16 · TypeScript · Zod · DeepSeek API · SQLite  
> **作品集方向**：AI 产品经理 · Agent 系统设计

本目录是项目的设计文档中心，记录了从产品定义到 Agent 架构、工作流设计、Prompt 工程和评测体系的完整思考链路。

---

## 文档地图

```
docs/
├── prd/
│   └── hireflow-v1-prd.md              ← 完整 PRD
│
├── agent-design/
│   ├── multi-agent-architecture.md     ← 多 Agent 架构（含 Mermaid 架构图）
│   └── prompt-engineering.md           ← Prompt 设计分析与迭代记录
│
├── workflow/
│   └── agent-orchestration.md          ← 完整工作流（含 6 张 Mermaid 流程图）
│
└── evaluation/
    ├── harness-design.md               ← 评测 Harness 设计文档
    ├── README.md                       ← 评测结果概览
    └── interview-defense.md            ← 评审问题答复
```

---

## 核心设计决策速览

| 决策 | 选择 | 关键原因 |
|---|---|---|
| Agent 数量 | 6 个职责单一的 Agent | 单 Agent 上下文过长，角色冲突，无法独立测试 |
| 编排模式 | 顺序链（Sequential Chain） | 每步有人工干预点；强依赖关系不适合并发 |
| 总分计算 | 应用层加权，不依赖模型 | 防止模型绕过证据给"综合印象"分；HR 调权重无需重跑 |
| 风险保护 | 应用层代码硬规则 | Prompt 指令可能被忽略；评测显示模型边界保护率仅 76.7% |
| 评测体系 | 30 条用例 + Judge LLM + 12 个指标 | 量化 Agent 质量，支持 Prompt 迭代的回归检测 |
| 温度 | 0.1 | 招聘评分需要稳定可复现，不需要创意 |
| 幻觉防控 | evidenceQuote 可定位性作为核心指标 | 不可定位的引用 = 幻觉，是招聘场景最不能接受的错误 |

---

## AI PM 能力点对应

| 文档 | 展示的 AI PM 能力 |
|---|---|
| [PRD](prd/hireflow-v1-prd.md) | 问题定义、范围界定、功能需求、非功能需求、成功指标、迭代路线 |
| [多 Agent 架构](agent-design/multi-agent-architecture.md) | Agent 系统设计、编排模式选择、架构决策记录（ADR）、Harness 有无 |
| [Prompt 工程](agent-design/prompt-engineering.md) | Prompt 设计原则、约束显式化、幻觉防控、迭代记录、局限性分析 |
| [工作流](workflow/agent-orchestration.md) | 用户旅程设计、错误处理流、状态机设计、演示/真实链路对比 |
| [评测 Harness](evaluation/harness-design.md) | 测试集设计、指标体系、Judge LLM 评价、Badcase 分析框架 |

---

## 快速启动

```bash
# 安装依赖
npm install

# 配置 API Key
cp .env.example .env.local
# 在 .env.local 中填写 DEEPSEEK_API_KEY

# 启动开发服务
npm run dev
# 访问 http://localhost:3000

# 点击"运行完整样例"查看演示（无需 API Key）
# 点击"创建职位"进入真实 Agent 链路

# 运行测试
npm run typecheck && npm run lint && npm test

# 运行离线评测（需要 API Key，约 15 分钟）
npm run eval
```
