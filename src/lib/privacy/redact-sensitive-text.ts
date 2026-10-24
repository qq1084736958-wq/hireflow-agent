export interface RedactionSummary {
  text: string;
  replacementCount: number;
  categories: Array<"姓名" | "手机号" | "邮箱" | "身份证号">;
}

interface RedactionOptions {
  detectCandidateName?: boolean;
}

const RESUME_HEADINGS = new Set(["个人简历", "个人信息", "教育背景", "工作经历", "项目经历", "求职意向", "专业技能"]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCandidateName(input: string) {
  const labeled = input.match(/姓名\s*[:：]?\s*([\u3400-\u9fff·]{2,8})/);
  if (labeled) return labeled[1];

  const lines = input.slice(0, 800).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lineCandidate = lines.find((line) => /^[\u3400-\u9fff·]{2,4}$/.test(line) && !RESUME_HEADINGS.has(line));
  if (lineCandidate) return lineCandidate;

  const pdfCandidate = input.slice(0, 800).match(/\[第\s*\d+\s*页\]\s*([\u3400-\u9fff·]{2,4})(?=\s)/)?.[1];
  return pdfCandidate && !RESUME_HEADINGS.has(pdfCandidate) ? pdfCandidate : null;
}

function replaceAndCount(
  value: string,
  pattern: RegExp,
  replacement: string | ((substring: string, ...args: string[]) => string),
) {
  let count = 0;
  const text = value.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === "function"
      ? replacement(args[0], ...args.slice(1))
      : replacement;
  });
  return { text, count };
}

export function redactSensitiveText(
  input: string,
  candidateAlias = "候选人",
  options: RedactionOptions = {},
): RedactionSummary {
  let text = input;
  let replacementCount = 0;
  const categories: RedactionSummary["categories"] = [];
  const detectedName = options.detectCandidateName ? detectCandidateName(input) : null;

  const rules: Array<{
    category: RedactionSummary["categories"][number];
    pattern: RegExp;
    replacement: string | ((substring: string, ...args: string[]) => string);
  }> = [
    ...(detectedName ? [{
      category: "姓名" as const,
      pattern: new RegExp(escapeRegExp(detectedName), "g"),
      replacement: candidateAlias,
    }] : []),
    {
      category: "邮箱",
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      replacement: "[已脱敏邮箱]",
    },
    {
      category: "手机号",
      pattern: /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d{9}(?!\d)/g,
      replacement: "[已脱敏手机号]",
    },
    {
      category: "身份证号",
      pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g,
      replacement: "[已脱敏身份证号]",
    },
    ...(!detectedName ? [{
      category: "姓名",
      pattern: /(姓名\s*[:：]?\s*)([\u3400-\u9fff·]{2,8})/g,
      replacement: (_match: string, prefix: string) => `${prefix}${candidateAlias}`,
    } as const] : []),
  ];

  for (const rule of rules) {
    const result = replaceAndCount(text, rule.pattern, rule.replacement);
    text = result.text;
    if (result.count > 0) {
      replacementCount += result.count;
      categories.push(rule.category);
    }
  }

  return { text, replacementCount, categories };
}
