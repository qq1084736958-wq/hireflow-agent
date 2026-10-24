import { ZodError, type ZodType } from "zod";
import { redactSensitiveText } from "../privacy/redact-sensitive-text";

export class AgentConfigurationError extends Error {}
export class AgentModelError extends Error {}

interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  jsonMode: boolean;
}

export const DEFAULT_AI_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_AI_MODEL = "deepseek-v4-flash";

export function getModelConfig(): ModelConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;

  if (!apiKey) {
    throw new AgentConfigurationError("DeepSeek 尚未配置。请在 .env.local 中设置 DEEPSEEK_API_KEY，然后重启开发服务。");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
    jsonMode: process.env.AI_JSON_MODE !== "false",
  };
}

export function isModelConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
}

export function getModelDeploymentMode() {
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).toLowerCase();
  return baseUrl.includes("api.deepseek.com") ? "public-cloud" as const : "custom-gateway" as const;
}

export function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(withoutFence);
}

export async function generateStructured<T>(options: {
  system: string;
  user: string;
  schema: ZodType<T>;
  schemaHint: string;
}): Promise<T> {
  const config = getModelConfig();
  const safeUserContent = redactSensitiveText(options.user, "候选人").text;
  let lastError: unknown;
  let previousContent = "";
  let validationFeedback = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const repairInstruction = attempt > 0
        ? `\n\n上一次输出未通过结构校验。请只修复 JSON，不要解释。\n校验错误：${validationFeedback}\n上一次输出：${previousContent.slice(0, 12_000)}`
        : "";
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.1,
          max_tokens: 8_000,
          thinking: { type: "disabled" },
          messages: [
            { role: "system", content: `${options.system}\n只返回 JSON，不要添加 Markdown。\n输出结构：${options.schemaHint}` },
            { role: "user", content: `${safeUserContent}${repairInstruction}` },
          ],
          ...(config.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new AgentModelError(`模型请求失败（${response.status}）：${body.slice(0, 300)}`);
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new AgentModelError("模型没有返回可解析的内容。");
      previousContent = content;
      const parsed = parseJsonContent(content);
      const result = options.schema.safeParse(parsed);
      if (result.success) return result.data;
      validationFeedback = result.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
      lastError = result.error;
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        validationFeedback = `JSON parse error: ${error.message}`;
      }
    }
  }

  if (lastError instanceof AgentConfigurationError || lastError instanceof AgentModelError) throw lastError;
  if (lastError instanceof ZodError) {
    throw new AgentModelError("模型返回的结构不符合要求，系统自动重试后仍未通过校验。请重试或适当精简输入内容。");
  }
  throw new AgentModelError(lastError instanceof Error ? `结构化输出校验失败：${lastError.message}` : "结构化输出校验失败。");
}
