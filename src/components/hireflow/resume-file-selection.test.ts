import { describe, expect, it } from "vitest";
import { MAX_RESUME_FILES, mergeResumeFiles } from "./resume-file-selection";

function resume(name: string, size = 1024, lastModified = 1, type = "application/pdf") {
  return { name, size, lastModified, type } as File;
}

describe("mergeResumeFiles", () => {
  it("adds valid PDF and TXT files and removes duplicates", () => {
    const pdf = resume("candidate.pdf");
    const txt = resume("candidate.txt", 512, 2, "text/plain");
    const result = mergeResumeFiles([pdf], [pdf, txt]);

    expect(result.files).toEqual([pdf, txt]);
    expect(result.message).toBeNull();
  });

  it("rejects unsupported, empty, and oversized files", () => {
    const result = mergeResumeFiles([], [
      resume("resume.docx", 1024, 1, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      resume("empty.pdf", 0, 2),
      resume("large.pdf", 10 * 1024 * 1024 + 1, 3),
    ]);

    expect(result.files).toHaveLength(0);
    expect(result.message).toContain("格式不支持");
    expect(result.message).toContain("超过 10MB");
    expect(result.message).toContain("空文件");
  });

  it("caps the combined list at ten files", () => {
    const files = Array.from({ length: MAX_RESUME_FILES + 2 }, (_, index) => resume(`${index}.pdf`, 1000, index));
    const result = mergeResumeFiles([], files);

    expect(result.files).toHaveLength(MAX_RESUME_FILES);
    expect(result.message).toContain("超过数量上限");
  });
});

