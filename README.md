# HireFlow Agent

证据驱动的招聘决策工作台。当前版本是一条可交互的作品集演示链路，覆盖岗位要求、候选人匹配、定制面试和报告输出。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。点击“运行完整样例”使用稳定演示数据；点击“创建职位”进入真实 Agent 链路。

## 配置真实模型

真实链路默认使用 DeepSeek 的 OpenAI-compatible Chat Completions 接口。复制配置文件：

```bash
copy .env.example .env.local
```

填写：

```env
DEEPSEEK_API_KEY=your-deepseek-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
```

修改环境变量后需要重启开发服务。密钥只在服务端读取，不会发送到浏览器。若需要更高质量，可将模型改为 `deepseek-v4-pro`。

`AI_BASE_URL` 可替换为企业内部 OpenAI-compatible API 网关或私有模型地址。默认配置连接 DeepSeek 公网 API；这不等同于私有化部署。

## 数据与隐私边界

- 简历原始文件仅用于服务端即时提取，不写入项目数据库。
- 发送模型前自动替换手机号、邮箱、身份证号和明确标注的姓名。
- 项目数据库保存岗位结构、脱敏后的简历文本、面试回答和生成报告。
- 当前作品集版本没有用户登录、字段级查看权限、审计审批或数据库加密，不能作为企业生产合规方案。
- 正式企业落地应通过内部 API 网关或私有模型，并补充身份认证、RBAC、审计日志、数据保留周期和静态加密。

## 当前能力

- 内置 AI 产品经理岗位与三位虚构候选人。
- 可编辑岗位评分权重，并要求权重合计为 100%。
- 候选人排序、分项评分与简历证据映射。
- 针对候选人差距生成的结构化面试问题。
- 明确标识的候选人模拟回答与回答评价。
- 可追溯的面试报告和 Agent 执行记录。
- 真实 JD 结构化接口 `POST /api/agent/analyze-job`。
- PDF/TXT 简历提取与解析接口 `POST /api/agent/parse-resume`。
- 证据匹配接口 `POST /api/agent/match`，总分由应用程序计算。
- 服务端演示工作流接口 `POST /api/demo-run`。

## 设计边界

系统同时提供真实模型链路与可复现演示数据。当前真实链路支持单岗位、单候选人的 JD 解析、PDF/TXT 简历解析和证据匹配；多候选人持久化与完整面试编排将在下一迭代接入。系统不会自动录用或淘汰候选人。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
