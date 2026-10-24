import fs from "node:fs";
import path from "node:path";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node scripts/export-codex-visible-transcript.mjs <rollout.jsonl> <output.md>",
  );
  process.exit(1);
}

const getMessageText = (payload) =>
  (payload.content ?? [])
    .map((item) => item.text ?? item.input_text ?? item.output_text ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

const cleanUserText = (text) =>
  text
    .replace(
      /<in-app-browser-context[\s\S]*?<\/in-app-browser-context>\s*/g,
      "",
    )
    .replace(/^## My request for Codex:\s*/m, "")
    .trim();

const records = [];
const seen = new Set();

for (const line of fs.readFileSync(inputPath, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;

  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }

  if (row.type !== "response_item" || row.payload?.type !== "message") {
    continue;
  }

  const role = row.payload.role;
  if (role !== "user" && role !== "assistant") continue;

  let text = getMessageText(row.payload);
  if (role === "user") text = cleanUserText(text);
  if (!text) continue;

  if (
    role === "user" &&
    (text.startsWith("<recommended_plugins>") ||
      text.startsWith("<environment_context>"))
  ) {
    continue;
  }

  const key = `${role}\u0000${text}`;
  if (seen.has(key)) continue;
  seen.add(key);

  records.push({
    timestamp: row.timestamp ?? "",
    role,
    text,
  });
}

const lines = [
  "# HireFlow Codex 可见对话记录",
  "",
  "> 本文件从 Codex 本地任务记录中自动提取，仅保留用户与助手可见消息。系统/开发者指令、内部推理、工具事件、令牌统计和原始 JSONL 已排除。部分早期助手消息未在当前本地记录中以可见消息事件保存，完整实施结果请参见 `project-history-and-decisions.md`。",
  "",
];

records.forEach((record, index) => {
  const label = record.role === "user" ? "用户" : "助手";
  lines.push(
    `## ${String(index + 1).padStart(3, "0")} · ${label}`,
    "",
    record.timestamp ? `时间：${record.timestamp}` : "",
    "",
    record.text,
    "",
  );
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.filter((line) => line !== null).join("\n")}\n`);

console.log(
  JSON.stringify({
    outputPath,
    total: records.length,
    user: records.filter((record) => record.role === "user").length,
    assistant: records.filter((record) => record.role === "assistant").length,
  }),
);
