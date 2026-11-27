import { describe, expect, it } from "vitest";
import { extractResumeRawText, validateResumeFile } from "@/lib/resume-extract";
import { extractSkillsFromText } from "@/lib/job-sync";

describe("validateResumeFile", () => {
  it("accepts valid PDF within 15MB limit", () => {
    const res = validateResumeFile({
      name: "Arvind_Resume.pdf",
      type: "application/pdf",
      size: 512_000,
    });
    expect(res.ok).toBe(true);
  });

  it("rejects empty files and oversized files", () => {
    expect(
      validateResumeFile({ name: "empty.pdf", type: "application/pdf", size: 0 }).ok
    ).toBe(false);
    expect(
      validateResumeFile({
        name: "huge.pdf",
        type: "application/pdf",
        size: 16 * 1024 * 1024,
      }).ok
    ).toBe(false);
  });

  it("rejects unsupported file extensions", () => {
    const res = validateResumeFile({
      name: "malware.exe",
      type: "application/x-msdownload",
      size: 1024,
    });
    expect(res.ok).toBe(false);
  });
});

describe("extractResumeRawText & extractSkillsFromText", () => {
  it("extracts text from plain text resumes and matches skills", async () => {
    const text = "Full Stack Engineer skilled in Python, Next.js, TypeScript, and REST APIs.";
    const { rawText } = await extractResumeRawText(
      Buffer.from(text, "utf-8"),
      "text/plain",
      "resume.txt"
    );
    expect(rawText).toBe(text);

    const skills = extractSkillsFromText(rawText);
    expect(skills).toContain("Python");
    expect(skills).toContain("Next.js");
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("REST APIs");
  });
});
