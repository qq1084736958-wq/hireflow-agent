import { NextResponse } from "next/server";
import { agentErrorResponse } from "@/lib/agent/api-error";
import { extractResumeText } from "@/lib/agent/extract-resume";
import { generateStructured } from "@/lib/agent/model-client";
import { resumeAnalysisPrompt } from "@/lib/agent/prompts";
import { resumeProfileSchema } from "@/lib/agent/schemas";
import { redactSensitiveText } from "@/lib/privacy/redact-sensitive-text";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const pastedText = formData.get("text");

    let resumeText = "";
    if (file instanceof File && file.size > 0) {
      resumeText = await extractResumeText(file);
    } else if (typeof pastedText === "string" && pastedText.trim().length >= 80) {
      resumeText = pastedText.trim();
    } else {
      throw new Error("请上传 PDF/TXT 简历，或粘贴至少 80 个字符的简历文本。");
    }

    const alias = `候选人-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const redacted = redactSensitiveText(resumeText.slice(0, 30_000), alias, { detectCandidateName: true });
    const safeSourceName = file instanceof File ? "已脱敏简历" : "已脱敏粘贴文本";

    const profile = await generateStructured({
      ...resumeAnalysisPrompt,
      schema: resumeProfileSchema,
      user: `简历来源：${safeSourceName}\n候选人代号：${alias}\n\n脱敏简历文本：\n${redacted.text}`,
    });

    return NextResponse.json({
      profile: { ...profile, candidateName: alias },
      resumeText: redacted.text,
      sourceName: safeSourceName,
      privacy: {
        redacted: true,
        replacementCount: redacted.replacementCount,
        categories: redacted.categories,
      },
      run: {
        agent: "Resume Analyst",
        action: "脱敏与简历事实提取完成",
        sourceCharacters: redacted.text.length,
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
