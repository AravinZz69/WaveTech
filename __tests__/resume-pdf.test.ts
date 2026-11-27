import { describe, expect, it } from "vitest";
import { buildPdfFileName, generateTailoredResumePdf, sanitizePdfText } from "../lib/resume-pdf";

describe("resume-pdf", () => {
  it("sanitizes unsupported Unicode symbols into WinAnsi-safe text", () => {
    const cleaned = sanitizePdfText("Salary: ₹18 LPA → Global • Remote — Senior Engineer ✓");
    expect(cleaned).toContain("INR 18 LPA");
    expect(cleaned).toContain("->");
    expect(cleaned).toContain("[x]");
  });

  it("builds safe download filenames ending in .pdf", () => {
    expect(buildPdfFileName("Linear Labs / Inc.", "Senior Full-Stack Engineer")).toBe(
      "Linear_Labs_Inc_Senior_Full_Stack_Engineer_Tailored.pdf"
    );
  });

  it("generates a valid multi-line PDF buffer for a tailored resume", async () => {
    const buf = await generateTailoredResumePdf({
      title: "Senior Full-Stack Engineer — Stripe",
      candidateName: "Aravind Kumar",
      companyName: "Stripe",
      jobTitle: "Senior Full-Stack Engineer",
      tailoredText: [
        "# Aravind Kumar",
        "Bangalore, India | aravind@example.com",
        "",
        "## Summary",
        "**Full-stack engineer** building TypeScript & Next.js products targeting ₹24 LPA+.",
        "",
        "## Experience",
        "### Software Engineer — Acme Corp",
        "- Built distributed APIs reducing p95 latency by 42% across 12 services",
        "- Shipped customer dashboard in React 19 + PostgreSQL",
        "",
        "## Skills",
        "TypeScript, Next.js, React, PostgreSQL, Drizzle ORM",
      ].join("\n"),
    });

    expect(buf.byteLength).toBeGreaterThan(800);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
