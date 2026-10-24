import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "./redact-sensitive-text";

describe("redactSensitiveText", () => {
  it("masks common resume identifiers before model transmission", () => {
    const result = redactSensitiveText(
      "姓名：张三\n手机 13812345678\n邮箱 zhangsan@example.com\n身份证 110101199001011234",
      "候选人-A1B2C3",
      { detectCandidateName: true },
    );

    expect(result.text).toContain("姓名：候选人-A1B2C3");
    expect(result.text).toContain("[已脱敏手机号]");
    expect(result.text).toContain("[已脱敏邮箱]");
    expect(result.text).toContain("[已脱敏身份证号]");
    expect(result.text).not.toContain("13812345678");
    expect(result.replacementCount).toBe(4);
  });

  it("replaces an unlabeled name near the top of an extracted PDF", () => {
    const result = redactSensitiveText(
      "[第 1 页]\n李悦 产品经理\n工作经历：负责企业 AI 产品",
      "候选人-X9Y8Z7",
      { detectCandidateName: true },
    );

    expect(result.text).not.toContain("李悦");
    expect(result.text).toContain("候选人-X9Y8Z7 产品经理");
  });

  it("leaves ordinary job content intact", () => {
    const input = "负责企业 AI 产品从 0 到 1，并与工程团队协作。";
    expect(redactSensitiveText(input).text).toBe(input);
  });
});
