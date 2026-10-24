import { NextResponse } from "next/server";
import { z } from "zod";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { extractResumeText } from "@/lib/agent/extract-resume";
import {
  createResumeBatch,
  getLatestResumeBatchForProject,
} from "@/lib/agent/resume-batch-database";
import { startResumeBatch } from "@/lib/agent/resume-batch-worker";
import { jobAnalysisSchema } from "@/lib/agent/schemas";
import { redactSensitiveText } from "@/lib/privacy/redact-sensitive-text";
import { getProject } from "@/lib/projects/database";

export const runtime = "nodejs";

const projectIdSchema = z.string().uuid();

export async function GET(request: Request) {
  try {
    const projectId = projectIdSchema.parse(new URL(request.url).searchParams.get("projectId"));
    const batch = getLatestResumeBatchForProject(projectId);
    if (!batch) return NextResponse.json({ batch: null });
    startResumeBatch(batch.id);
    return NextResponse.json({ batch });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectId = projectIdSchema.parse(formData.get("projectId"));
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: "招聘项目不存在。" }, { status: 404 });
    const job = jobAnalysisSchema.parse(JSON.parse(String(formData.get("job") ?? "")));
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const pastedText = String(formData.get("text") ?? "").trim();
    const includeText = pastedText.length >= 80;
    if (files.length + (includeText ? 1 : 0) === 0) {
      throw new Error("请上传至少一份 PDF/TXT 简历，或粘贴至少 80 个字符的简历文本。");
    }
    if (files.length + (includeText ? 1 : 0) > 10) throw new Error("一次最多处理 10 份简历。");

    const sources: Array<{ sourceName: string; alias: string; resumeText: string; error?: string }> = [];
    for (let index = 0; index < files.length; index += 1) {
      const alias = `候选人-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      try {
        const extracted = await extractResumeText(files[index]);
        const redacted = redactSensitiveText(extracted.slice(0, 30_000), alias, { detectCandidateName: true });
        sources.push({ sourceName: `简历 ${String(index + 1).padStart(2, "0")}`, alias, resumeText: redacted.text });
      } catch (error) {
        sources.push({
          sourceName: `简历 ${String(index + 1).padStart(2, "0")}`,
          alias,
          resumeText: "",
          error: error instanceof Error ? error.message : "文件读取失败。",
        });
      }
    }
    if (includeText) {
      const alias = `候选人-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const redacted = redactSensitiveText(pastedText.slice(0, 30_000), alias, { detectCandidateName: true });
      sources.push({ sourceName: "粘贴文本候选人", alias, resumeText: redacted.text });
    }

    const batch = createResumeBatch({ projectId, job, items: sources });
    startResumeBatch(batch.id);
    return NextResponse.json({ batch }, { status: 202 });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

