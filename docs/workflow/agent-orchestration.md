# Agent 工作流与用户旅程

> 本文包含完整的 Mermaid 流程图，在 GitHub Markdown 中直接渲染。

---

## 1. 完整用户旅程（含系统行为）

```mermaid
journey
    title HireFlow 用户旅程 · HR 视角
    section 岗位创建
      粘贴 JD 文本: 5: HR
      查看解析结果: 4: HR
      调整评分权重: 3: HR
    section 候选人筛选
      上传简历 PDF: 5: HR
      查看证据匹配结果: 5: HR
      查看候选人排序: 4: HR
      查看单项分数明细: 4: HR
    section 面试准备
      生成结构化面试题: 5: HR
      查看面试题与出题理由: 4: HR
    section 报告输出
      查看面试评估报告: 5: HR
      下载/分享报告: 3: HR
```

---

## 2. 主链路：JD → 候选人报告

```mermaid
flowchart TD
    START([HR 打开工作台]) --> MODE{选择模式}

    MODE -->|演示模式| DEMO[加载预计算演示数据\n无 API 消耗]
    MODE -->|真实链路| JD_INPUT[粘贴 JD 文本]

    DEMO --> VIEW_RESULT

    JD_INPUT --> JD_AGENT["🔍 JD 解析 Agent\nanalyze-job API"]
    JD_AGENT --> JD_RESULT{解析结果}
    JD_RESULT -->|Zod 校验失败| JD_RETRY[携带校验错误\n自动重试 1 次]
    JD_RETRY --> JD_RESULT
    JD_RESULT -->|成功| JOB_MODEL[展示岗位能力模型\n5-10项要求 + 权重]

    JOB_MODEL --> WEIGHT_EDIT{HR 调整权重?}
    WEIGHT_EDIT -->|是| ADJUST[调整各项权重\n应用层验证合计=100]
    WEIGHT_EDIT -->|否| UPLOAD
    ADJUST --> UPLOAD

    UPLOAD[上传简历 PDF / TXT] --> EXTRACT[客户端 pdfjs 提取文字]
    EXTRACT --> REDACT[服务端隐私脱敏\n手机/邮箱/证件号]
    REDACT --> RESUME_AGENT["📄 简历解析 Agent\nparse-resume API"]
    RESUME_AGENT --> MATCH_AGENT["🎯 证据匹配 Agent\nmatch API"]

    MATCH_AGENT --> CALC["应用层计算\ntotalScore = Σ(score × weight / 100)"]
    CALC --> GUARD{风险保护检查}
    GUARD -->|必备项有未满足| FORCE_REVIEW[推荐结论强制为\n待人工确认]
    GUARD -->|无风险| KEEP[保持 Agent 推荐结论]

    FORCE_REVIEW --> VIEW_RESULT
    KEEP --> VIEW_RESULT

    VIEW_RESULT[展示候选人排序\n+ 逐项分数 + 证据引用] --> DETAIL[点击查看候选人详情]
    DETAIL --> HR_MODIFY{HR 修正分数?}
    HR_MODIFY -->|是| RECORD[记录 scoreSource=HR修正\n重新计算总分]
    HR_MODIFY -->|否| INTERVIEW_GEN

    RECORD --> INTERVIEW_GEN
    INTERVIEW_GEN["❓ 面试题生成 Agent\ngenerate-interview API"] --> VIEW_QUESTIONS[展示 6 道结构化面试题]
    VIEW_QUESTIONS --> SIMULATE{运行候选人模拟?}
    SIMULATE -->|是| SIM_AGENT["🎭 模拟回答 Agent\nsimulate-interview API"]
    SIMULATE -->|否| END_REPORT

    SIM_AGENT --> EVAL_AGENT["📊 面试评估 Agent\nevaluate-interview API"]
    EVAL_AGENT --> END_REPORT[查看完整面试报告\n+ Agent 执行轨迹]

    style JD_AGENT fill:#dbeafe,stroke:#3b82f6
    style RESUME_AGENT fill:#dbeafe,stroke:#3b82f6
    style MATCH_AGENT fill:#fef3c7,stroke:#f59e0b
    style INTERVIEW_GEN fill:#d1fae5,stroke:#10b981
    style SIM_AGENT fill:#ede9fe,stroke:#8b5cf6
    style EVAL_AGENT fill:#ede9fe,stroke:#8b5cf6
    style GUARD fill:#fee2e2,stroke:#ef4444
    style REDACT fill:#fce7f3,stroke:#ec4899
```

---

## 3. 证据匹配 Agent 内部逻辑

```mermaid
flowchart TD
    INPUT["输入：岗位要求列表 + 简历全文"] --> LOOP["遍历每个 requirement"]

    LOOP --> SEARCH["在简历中搜索相关证据"]
    SEARCH --> FOUND{找到直接原文?}

    FOUND -->|是| QUOTE["记录 evidenceQuote\n（连续原文片段）"]
    FOUND -->|否| NO_QUOTE["evidenceQuote = 空字符串"]

    QUOTE --> SCORE_WITH["给分 0-100\n基于证据质量和深度"]
    NO_QUOTE --> CHECK_KEYWORD{出现相关关键词?}

    CHECK_KEYWORD -->|是，但无产品证据| KEYWORD_WARN["⚠️ 关键词 ≠ 经验\nstatus=待验证\nscore 建议 < 30"]
    CHECK_KEYWORD -->|否| MISSING["status=待验证\nscore=0\nevidenceQuote=空"]

    SCORE_WITH --> STATUS_DECIDE{评分区间}
    STATUS_DECIDE -->|≥ 70| SATISFIED["status=已满足"]
    STATUS_DECIDE -->|40-69| PARTIAL["status=部分满足"]
    STATUS_DECIDE -->|< 40| PENDING["status=待验证 或 不满足"]

    SATISFIED & PARTIAL & PENDING & KEYWORD_WARN & MISSING --> AGGREGATE

    AGGREGATE["汇总所有 matches\n生成 strengths / gaps / risks"] --> RECOMMEND{推荐结论}

    RECOMMEND --> REC1["推荐面试"]
    RECOMMEND --> REC2["待人工确认"]
    RECOMMEND --> REC3["暂不推荐"]

    REC1 & REC2 & REC3 --> APP_GUARD["⚙️ 应用层风险保护\n必备项未满足 → 强制待人工确认"]

    style APP_GUARD fill:#fee2e2,stroke:#ef4444
    style KEYWORD_WARN fill:#fef3c7,stroke:#f59e0b
```

---

## 4. 错误处理与重试流

```mermaid
sequenceDiagram
    participant UI as 前端 UI
    participant API as Next.js API Route
    participant LLM as DeepSeek / 自定义模型
    participant ZOD as Zod 校验

    UI->>API: POST /api/agent/match
    API->>API: redactSensitiveText()
    API->>LLM: 第 1 次请求（temperature=0.1）
    
    alt 网络超时（60s）
        LLM-->>API: AbortSignal.timeout
        API-->>UI: 500 模型请求超时
    else 模型返回内容
        LLM-->>API: JSON 字符串
        API->>ZOD: schema.safeParse()
        
        alt 第 1 次通过
            ZOD-->>API: ✅ 解析成功
            API-->>UI: 200 结果
        else 第 1 次失败
            ZOD-->>API: ❌ 校验错误详情
            API->>LLM: 第 2 次请求（携带错误反馈 + 原始输出）
            LLM-->>API: 修复后 JSON
            API->>ZOD: schema.safeParse()
            
            alt 第 2 次通过
                ZOD-->>API: ✅ 解析成功
                API-->>UI: 200 结果
            else 第 2 次仍失败
                ZOD-->>API: ❌ 最终失败
                API-->>UI: 500 结构化输出校验失败，请重试
            end
        end
    end
```

---

## 5. 批量简历处理工作流（v1 实现）

```mermaid
stateDiagram-v2
    [*] --> Pending: 上传简历文件

    Pending --> Extracting: 开始提取文字
    Extracting --> Redacting: PDF 文字提取完成
    Redacting --> Parsing: 脱敏完成
    Parsing --> Matching: 简历解析完成
    Matching --> Completed: 匹配完成

    Extracting --> Failed: PDF 格式不支持
    Parsing --> Failed: 模型输出校验失败（重试后）
    Matching --> Failed: 模型输出校验失败（重试后）

    Failed --> [*]: 展示错误信息，支持手动重试
    Completed --> [*]: 展示评分结果
```

---

## 6. 演示模式 vs 真实链路对比

```mermaid
flowchart LR
    subgraph DEMO["演示模式（稳定演示）"]
        D1[点击"运行完整样例"] --> D2[加载 demo-data.ts\n预计算结果]
        D2 --> D3[立即展示所有候选人\n无延迟无 API 消耗]
    end

    subgraph REAL["真实链路（消耗 API）"]
        R1[点击"创建职位"] --> R2[粘贴 JD → 调用 AI]
        R2 --> R3[上传简历 → 调用 AI]
        R3 --> R4[实时返回证据匹配结果]
    end

    DEMO -.->|"相同的 UI 组件\n不同的数据来源"| REAL
```

> **设计意图**：演示模式确保任何时候都有可复现的稳定演示，不依赖 API 可用性。真实链路展示系统的实际能力。两套路径共用完全相同的 UI 组件，由数据来源区分。
