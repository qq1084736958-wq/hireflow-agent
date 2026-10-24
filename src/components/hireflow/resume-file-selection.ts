export const MAX_RESUME_FILES = 10;
export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set(["pdf", "txt"]);
const ACCEPTED_TYPES = new Set(["application/pdf", "text/plain"]);

export interface ResumeFileSelection {
  files: File[];
  message: string | null;
}

function isAcceptedResume(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.has(extension) || ACCEPTED_TYPES.has(file.type);
}

function fileKey(file: File) {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
}

export function mergeResumeFiles(current: File[], incoming: File[]): ResumeFileSelection {
  const accepted: File[] = [];
  let unsupported = 0;
  let oversized = 0;
  let empty = 0;

  for (const file of incoming) {
    if (!isAcceptedResume(file)) {
      unsupported += 1;
    } else if (file.size === 0) {
      empty += 1;
    } else if (file.size > MAX_RESUME_FILE_SIZE) {
      oversized += 1;
    } else {
      accepted.push(file);
    }
  }

  const unique = new Map(current.map((file) => [fileKey(file), file]));
  for (const file of accepted) unique.set(fileKey(file), file);
  const allValid = Array.from(unique.values());
  const files = allValid.slice(0, MAX_RESUME_FILES);
  const excess = Math.max(0, allValid.length - MAX_RESUME_FILES);

  const issues = [
    unsupported > 0 ? `${unsupported} 份格式不支持` : null,
    oversized > 0 ? `${oversized} 份超过 10MB` : null,
    empty > 0 ? `${empty} 份为空文件` : null,
    excess > 0 ? `${excess} 份超过数量上限` : null,
  ].filter(Boolean);

  return {
    files,
    message: issues.length > 0 ? `${issues.join("，")}，未加入列表。` : null,
  };
}

