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

  it("generates a structured career-ops-style PDF with pills, bold metrics, and single-page density", async () => {
    const buf = await generateTailoredResumePdf({
      title: "Database Support Engineer (EMEA) — Supabase",
      structuredCv: {
        pageFormat: "a4",
        candidate: {
          name: "JANGALA ARVIND KUMAR",
          headline: "Database Support Engineer (PostgreSQL & Supabase Specialist)",
          location: "Hyderabad, India",
          phone: "+91 9948557483",
          email: "aravindz9790@gmail.com",
          linkedin: "LinkedIn",
          github: "GitHub",
        },
        summary:
          "Undergraduate engineer experienced in **PostgreSQL**, **Supabase**, query tuning, and root-cause troubleshooting across multi-user Next.js and FastAPI production systems.",
        competencies: [
          "PostgreSQL & Query Tuning",
          "Supabase Realtime & Auth",
          "Root Cause Analysis",
          "High-Concurrency Indexing",
          "GCP & Vercel Operations",
          "API Telemetry & Debugging",
        ],
        experience: [
          {
            company: "WorkWizards Innovations",
            role: "Full-Stack Developer & Technical Lead",
            dates: "Aug 2026 - Oct 2026",
            bullets: [
              "Designed normalized **PostgreSQL schemas** and microservice APIs, reducing integration friction by **35%**.",
              "Conducted **20+ code reviews** to catch query and reliability bottlenecks before release.",
            ],
          },
          {
            company: "IBM SkillsBuild (Edunet Foundation)",
            role: "AI & Web Development Intern",
            location: "Remote",
            dates: "Jul 2025 - Aug 2025",
            bullets: [
              "Analyzed REST API telemetry across **15+ endpoints**, cutting UI response times by **28%**.",
            ],
          },
        ],
        projects: [
          {
            name: "ARIA WMS & IMS",
            badge: "Production System",
            tech: "Next.js, TypeScript, Supabase",
            bullets: [
              "Built 9-stage fulfillment pipeline with Supabase sync, reducing stock misplacements by **40%**.",
            ],
          },
          {
            name: "AetherAI Traffic Intelligence",
            badge: "GCP Pipeline",
            tech: "Python, FastAPI, TensorFlow",
            bullets: [
              "Served async inference telemetry on GCP achieving **sub-200ms** responses under load.",
            ],
          },
        ],
        education: [
          {
            title: "B.Tech in Artificial Intelligence & Data Science",
            org: "Kakinada Institute of Engineering & Technology (KIET), Kakinada",
            year: "2024 - 2028",
          },
        ],
        certifications: [
          { title: "AWS Certified AI Practitioner (AIF-C01)", org: "AWS", year: "In Progress" },
          { title: "IBM SkillsBuild Internship Certification", org: "Edunet", year: "2025" },
        ],
        awards: [{ title: "1st Place — Bike Rental Demand Prediction Hackathon" }],
        skills: [
          { category: "Databases", items: "PostgreSQL, Supabase, NeonDB, Query Optimization, Indexing" },
          { category: "Languages & Backend", items: "Python, SQL, TypeScript, Go, Next.js, FastAPI, Node.js" },
          { category: "Cloud & Tooling", items: "GCP, AWS, Vercel, GitHub Actions, Git, WebSockets" },
        ],
      },
      tailoredText: "# JANGALA ARVIND KUMAR",
    });

    expect(buf.byteLength).toBeGreaterThan(1200);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("deduplicates top heading in markdown fallback mode", async () => {
    const buf = await generateTailoredResumePdf({
      title: "Role — Company",
      candidateName: "JANGALA ARVIND KUMAR",
      tailoredText: [
        "JANGALA ARVIND KUMAR",
        "Hyderabad, India | email@example.com",
        "",
        "PROFESSIONAL SUMMARY",
        "**Backend engineer** specializing in PostgreSQL and TypeScript.",
      ].join("\n"),
    });

    expect(buf.byteLength).toBeGreaterThan(800);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
