const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function extractResumeText(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error("文件不能超过 10MB。");

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || file.type === "text/plain") {
    const text = (await file.text()).trim();
    if (!text) throw new Error("文本文件没有可读取的内容。");
    return text;
  }

  if (extension !== "pdf" && file.type !== "application/pdf") {
    throw new Error("当前仅支持 PDF 和 TXT 文件。");
  }

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(`[第 ${pageNumber} 页]\n${text}`);
  }

  const extracted = pages.join("\n\n").trim();
  if (!extracted) throw new Error("该 PDF 没有可提取的文本，请粘贴简历文本或上传文本型 PDF。");
  return extracted;
}
