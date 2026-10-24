# HireFlow Agent

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**证据驱动的 AI 招聘决策工作台。**

将 JD 和简历交给 6 个职责单一的 Agent 串联处理：JD 结构化 → 简历解析 → 逐项证据匹配 → 定制面试题 → 面试报告。每个评分背后都有简历原文引用；系统永远不自动录用或淘汰候选人。

> 📁 **[设计文档中心 →](docs/README.md)**  完整 PRD · 多 Agent 架构 · Prompt 工程 · 评测 Harness

---

## 架构概览

```
JD 文本 ──→ [JD 解析 Agent] ──→ 岗位能力模型（5-10项 + 权重）
                                        ↓
简历 PDF ──→ 隐私脱敏 ──→ [简历解析 Agent] ──→ 结构化 Profile
                                        ↓
                          [证据匹配 Agent] ──→ 逐项分数 + 原文引用
                                        ↓
                       应用层加权计算总分 + 风险保护规则
                                        ↓
                          [面试题生成 Agent] ──→ 6 道结构化面试题
                                        ↓
                          [面试评估 Agent] ──→ STAR 评分 + 推进建议
```

**设计亮点：**
- 总分由应用层代码计算（非 AI 直接给结论），HR 调整权重无需重跑 Agent
- `evidenceQuote` 必须可在简历原文中直接搜索到；无证据时为空字符串，不允许模型杜撰
- 30 条离线评测用例（常规 + 边界 + 公平性反事实），引用定位率 95.7%，无证据高分率 0%

---

## 快速启动

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

- 点击**「运行完整样例」**：使用预计算演示数据，无需 API Key，立即可用
- 点击**「创建职位」**：进入真实 Agent 链路，需配置 API Key（见下）

### 配置真实模型

```bash
cp .env.example .env.local
```

```env
DEEPSEEK_API_KEY=your-deepseek-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
```

`AI_BASE_URL` 可替换为企业内部 OpenAI-compatible API 网关或私有模型地址。

---

## 设计文档

| 文档 | 内容 |
|---|---|
| [📋 产品需求文档（PRD）](docs/prd/hireflow-v1-prd.md) | 问题定义、功能需求、成功指标、迭代路线 |
| [🏗️ 多 Agent 架构](docs/agent-design/multi-agent-architecture.md) | 6 个 Agent 的职责划分、编排模式、架构决策（ADR） |
| [✍️ Prompt 工程设计](docs/agent-design/prompt-engineering.md) | 每个 Agent 的 Prompt 设计思路、防幻觉机制、已知局限 |
| [🔄 工作流与用户旅程](docs/workflow/agent-orchestration.md) | 完整 Mermaid 流程图、错误处理、演示/真实链路对比 |
| [🧪 评测 Harness 设计](docs/evaluation/harness-design.md) | 测试集设计、12 个评测指标、Badcase 分析框架 |
| [📊 评测报告](output/evaluation/evaluation-report.md) | 30 条案例离线评测结果（含稳定性复测和公平性测试） |

---

## 数据与隐私边界

- 简历原始文件仅在服务端即时提取，不写入数据库
- 发送模型前自动替换手机号、邮箱、身份证号和标注姓名
- v1 无用户登录、RBAC、审计日志和数据库加密，不能作为企业生产合规方案

---

## 验证

```bash
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint
npm test            # 单元测试（Vitest）
npm run build       # 构建验证

npm run eval        # 离线评测（需 API Key，约 15 分钟）
npm run eval:report # 重新生成评测报告（基于已有结果）
```

---

## 当前能力与设计边界

v1 支持单岗位单候选人的完整链路（JD 解析 → 简历解析 → 证据匹配 → 面试设计 → 面试报告）。
多候选人批次持久化、HR 权限管理、ATS 对接将在 v2 接入。
系统不会自动录用或淘汰候选人。
