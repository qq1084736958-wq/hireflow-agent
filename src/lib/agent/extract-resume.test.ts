import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractResumeText } from "./extract-resume";

describe("extractResumeText", () => {
  it("extracts text from a PDF in the server runtime", async () => {
    const bytes = new Uint8Array(
      await readFile(join(process.cwd(), "test-resume.pdf")),
    );
    const file = new File([bytes], "candidate.pdf", {
      type: "application/pdf",
    });

    const text = await extractResumeText(file);

    expect(text).toContain("Test Candidate");
    expect(text).toContain("AI recruiting agent");
  });
});
