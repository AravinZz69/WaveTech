import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ParsedResumeData } from "@/db/schema";
import { WORK_CATEGORIES, COMMON_ROLES } from "./constants";
import { traceSlowOperation, withTimeout } from "./telemetry";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add your Gemini API key from Google AI Studio to .env.local."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });
}

const parsedResumeSchema = z.object({
  fullName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  headline: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  skills: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  experienceYears: z.number().min(0).max(40).default(0),
  stage: z.enum(["Student", "Graduate", "Working"]).default("Graduate"),
  githubUrl: z.string().optional().default(""),
  portfolioUrl: z.string().optional().default(""),
  experience: z
    .array(
      z.object({
        company: z.string().default(""),
        role: z.string().default(""),
        duration: z.string().default(""),
        bullets: z.array(z.string()).default([]),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        tech: z.array(z.string()).default([]),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().default(""),
        degree: z.string().default(""),
        year: z.string().default(""),
      })
    )
    .default([]),
  improvementSuggestions: z.array(z.string()).default([]),
});

function extractJsonObject(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI response did not contain valid JSON.");
  }
}

export async function parseResumeWithAI(input: {
  rawText: string;
  fileBuffer?: Buffer;
  mimeType?: string;
}): Promise<{ parsed: ParsedResumeData; extractedText: string }> {
  const ai = getGeminiClient();

  const prompt = `You are Wave Tech's career-agent resume parser.
Extract structured candidate memory and profile fields from the resume.
Map categories strictly to the closest matches from: ${WORK_CATEGORIES.join(", ")}.
Map target roles to concise standard titles (examples: ${COMMON_ROLES.join(", ")}).
Estimate total full-time professional experienceYears as an integer (0 for students/freshers with only internships).
Set stage to "Student", "Graduate", or "Working".
Include 3-5 concrete, honest improvementSuggestions for this resume.
Return ONLY valid JSON matching this schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "headline": string,
  "summary": string,
  "skills": string[],
  "categories": string[],
  "roles": string[],
  "experienceYears": number,
  "stage": "Student" | "Graduate" | "Working",
  "githubUrl": string,
  "portfolioUrl": string,
  "experience": [{ "company": string, "role": string, "duration": string, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string[] }],
  "education": [{ "institution": string, "degree": string, "year": string }],
  "improvementSuggestions": string[],
  "plainTextTranscript": string
}`;

  const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

  if (
    input.fileBuffer &&
    input.mimeType &&
    (input.mimeType.startsWith("image/") ||
      (input.mimeType === "application/pdf" && input.rawText.length < 200))
  ) {
    contents.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.fileBuffer.toString("base64"),
      },
    });
  }

  contents.push(
    input.rawText
      ? `${prompt}\n\nExtracted resume text:\n${input.rawText.slice(0, 24000)}`
      : prompt
  );

  const response = await traceSlowOperation("gemini_parse_resume", () =>
    withTimeout(
      ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents,
        config: {
          responseMimeType: "application/json",
        },
      }),
      45000,
      "Gemini resume parsing"
    )
  );

  const text = response.text || "{}";
  const rawObj = extractJsonObject(text) as Record<string, unknown>;
  const parsed = parsedResumeSchema.parse(rawObj);
  const transcript =
    typeof rawObj.plainTextTranscript === "string" && rawObj.plainTextTranscript.trim()
      ? rawObj.plainTextTranscript.trim()
      : input.rawText;

  return { parsed, extractedText: transcript || input.rawText };
}

export async function reviewResumeWithAI(input: {
  resumeText: string;
  targetRoles: string[];
}): Promise<{ summary: string; strengths: string[]; improvements: string[] }> {
  const ai = getGeminiClient();

  const response = await traceSlowOperation("gemini_review_resume", () =>
    withTimeout(
      ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: `You are Wave Tech's career coach. Review this candidate resume honestly for target roles (${input.targetRoles.join(", ") || "software & AI"}).
Return ONLY JSON:
{
  "summary": "2-sentence crisp assessment",
  "strengths": ["3 specific strengths"],
  "improvements": ["4 concrete, actionable edits with examples"]
}

Resume:
${input.resumeText.slice(0, 18000)}`,
        config: { responseMimeType: "application/json" },
      }),
      35000,
      "Gemini resume review"
    )
  );

  const obj = extractJsonObject(response.text || "{}") as {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
  };

  return {
    summary: obj.summary || "Resume reviewed.",
    strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
    improvements: Array.isArray(obj.improvements) ? obj.improvements : [],
  };
}

export interface TailoredCvPayload {
  pageFormat?: "a4" | "letter";
  candidate: {
    name: string;
    headline?: string;
    location?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  competencies: string[];
  experience: Array<{
    company: string;
    role: string;
    location?: string;
    dates: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    badge?: string;
    tech?: string;
    url?: string;
    bullets: string[];
  }>;
  education: Array<{
    title: string;
    org: string;
    location?: string;
    year: string;
    description?: string;
  }>;
  certifications: Array<{
    title: string;
    org?: string;
    year?: string;
  }>;
  awards: Array<{
    title: string;
    org?: string;
    year?: string;
  }>;
  skills: Array<{
    category?: string;
    items: string;
  }>;
}

function formatStructuredCvMarkdown(cv: TailoredCvPayload): string {
  const lines: string[] = [];
  lines.push(`# ${cv.candidate.name}`);
  if (cv.candidate.headline) lines.push(cv.candidate.headline);
  const contact = [
    cv.candidate.location,
    cv.candidate.phone,
    cv.candidate.email,
    cv.candidate.linkedin,
    cv.candidate.github,
    cv.candidate.portfolio,
  ].filter(Boolean);
  if (contact.length > 0) lines.push(contact.join(" | "));
  lines.push("");

  if (cv.summary) {
    lines.push("## Professional Summary", cv.summary, "");
  }
  if (cv.competencies.length > 0) {
    lines.push("## Core Competencies", cv.competencies.join(" · "), "");
  }
  if (cv.experience.length > 0) {
    lines.push("## Work Experience");
    for (const exp of cv.experience) {
      lines.push(`### ${exp.company} — ${exp.role} (${exp.dates}${exp.location ? ` · ${exp.location}` : ""})`);
      for (const b of exp.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (cv.projects.length > 0) {
    lines.push("## Technical Projects");
    for (const proj of cv.projects) {
      lines.push(`### ${proj.name}${proj.badge ? ` | ${proj.badge}` : ""}${proj.tech ? ` (${proj.tech})` : ""}`);
      for (const b of proj.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (cv.education.length > 0) {
    lines.push("## Education");
    for (const edu of cv.education) {
      lines.push(`- **${edu.title}** — ${edu.org}${edu.year ? ` (${edu.year})` : ""}`);
    }
    lines.push("");
  }
  if (cv.certifications.length > 0) {
    lines.push("## Certifications");
    for (const cert of cv.certifications) {
      lines.push(`- ${cert.title}${cert.org ? ` — ${cert.org}` : ""}${cert.year ? ` (${cert.year})` : ""}`);
    }
    lines.push("");
  }
  if (cv.awards.length > 0) {
    lines.push("## Awards & Honors");
    for (const aw of cv.awards) {
      lines.push(`- ${aw.title}${aw.org ? ` — ${aw.org}` : ""}${aw.year ? ` (${aw.year})` : ""}`);
    }
    lines.push("");
  }
  if (cv.skills.length > 0) {
    lines.push("## Technical Skills");
    for (const sk of cv.skills) {
      lines.push(sk.category ? `- **${sk.category}:** ${sk.items}` : `- ${sk.items}`);
    }
  }

  return lines.join("\n").trim();
}

export async function tailorResumeWithAI(input: {
  resumeText: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobSkills: string[];
  intensity: "light" | "balanced" | "deep";
  candidateFallbackName?: string;
}): Promise<{
  tailoredText: string;
  structuredCv: TailoredCvPayload | null;
  tailorNotes: string;
  matchedKeywords: string[];
}> {
  const ai = getGeminiClient();

  const intensityInstruction =
    input.intensity === "light"
      ? "Light edit: keep experience bullets almost identical; optimize headline, competency pills, skill category ordering, and surface JD-matching evidence cleanly."
      : input.intensity === "deep"
      ? "Deep tailor: rewrite summary and bullet phrasing using the exact JD vocabulary to foreground directly relevant systems and quantified impact without fabricating anything."
      : "Balanced tailor: refine headline, 3-line summary, competencies, and top project/experience bullets using honest JD-aligned framing.";

  const response = await traceSlowOperation("gemini_tailor_resume", () =>
    withTimeout(
      ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: `You are Wave Tech's ATS-optimized resume architect (following strict factual integrity & 6-second recruiter scan rules).
STRICT FACT GATE:
- NEVER invent employers, titles, dates, degrees, certifications, metrics, numbers, or skills absent from the Candidate Original Resume.
- Only reformulate verified experience using JD vocabulary (e.g., bold key verified numbers/metrics using **40%** or **sub-200ms**).
- Drop empty optional sections rather than inventing placeholders.
- Keep bullet points punchy (1-2 lines max each, action-verb + system + quantified outcome) so the tailored resume fits crisply in 1 tight page (or balanced 2 pages for extensive experience) without dangling lines.
- Pick pageFormat: "letter" if the job is US/Canada, otherwise "a4".

${intensityInstruction}

Target Role: ${input.jobTitle} at ${input.companyName}
Required Skills: ${input.jobSkills.join(", ")}
Job Description:
${input.jobDescription.slice(0, 5000)}

Candidate Original Resume:
${input.resumeText.slice(0, 16000)}

Return ONLY valid JSON:
{
  "structuredCv": {
    "pageFormat": "a4",
    "candidate": {
      "name": "Full name from resume",
      "headline": "Sharp 4-8 word target headline aligned to role",
      "location": "City, Country",
      "phone": "Phone if in resume",
      "email": "Email if in resume",
      "linkedin": "LinkedIn URL or handle if in resume",
      "github": "GitHub URL or handle if in resume",
      "portfolio": "Portfolio URL if in resume"
    },
    "summary": "Crisp 3-line tailored summary answering target role fit + strongest verified proof (use **bold** for 2-3 key metrics/phrases).",
    "competencies": ["6 to 8 high-signal verified JD competency phrases from candidate background"],
    "experience": [
      {
        "company": "Company Name",
        "role": "Role Title",
        "location": "Remote or City",
        "dates": "Mon YYYY - Mon YYYY",
        "bullets": ["Outcome-driven bullet with **bolded** verified metric"]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "badge": "Short tag like Production System",
        "tech": "Comma-separated verified stack",
        "bullets": ["1-2 crisp impact bullets with **bolded** verified metric"]
      }
    ],
    "education": [
      { "title": "Degree", "org": "Institution", "location": "City", "year": "2024 - 2028", "description": "" }
    ],
    "certifications": [
      { "title": "Certification name", "org": "Issuer", "year": "2025" }
    ],
    "awards": [
      { "title": "Award or Hackathon Win", "org": "Event", "year": "2025" }
    ],
    "skills": [
      { "category": "Category", "items": "Comma-separated verified skills prioritized for JD" }
    ]
  },
  "tailorNotes": "Short 2-3 sentence summary of what was tailored, top matched keywords, and any real skill gaps.",
  "matchedKeywords": ["list of verified JD keywords highlighted"]
}`,
        config: { responseMimeType: "application/json" },
      }),
      45000,
      "Gemini resume tailoring"
    )
  );

  const obj = extractJsonObject(response.text || "{}") as {
    structuredCv?: Partial<TailoredCvPayload>;
    tailoredText?: string;
    tailorNotes?: string;
    matchedKeywords?: string[];
  };

  let structuredCv: TailoredCvPayload | null = null;
  if (obj.structuredCv && obj.structuredCv.candidate?.name) {
    const raw = obj.structuredCv;
    structuredCv = {
      pageFormat: raw.pageFormat === "letter" ? "letter" : "a4",
      candidate: {
        name: raw.candidate?.name || input.candidateFallbackName || "Candidate",
        headline: raw.candidate?.headline,
        location: raw.candidate?.location,
        phone: raw.candidate?.phone,
        email: raw.candidate?.email,
        linkedin: raw.candidate?.linkedin,
        github: raw.candidate?.github,
        portfolio: raw.candidate?.portfolio,
      },
      summary: typeof raw.summary === "string" ? raw.summary : "",
      competencies: Array.isArray(raw.competencies) ? raw.competencies.slice(0, 8) : [],
      experience: Array.isArray(raw.experience) ? raw.experience : [],
      projects: Array.isArray(raw.projects) ? raw.projects.slice(0, 4) : [],
      education: Array.isArray(raw.education) ? raw.education : [],
      certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
      awards: Array.isArray(raw.awards) ? raw.awards : [],
      skills: Array.isArray(raw.skills) ? raw.skills : [],
    };
  }

  const tailoredText = structuredCv
    ? formatStructuredCvMarkdown(structuredCv)
    : obj.tailoredText || input.resumeText;

  return {
    tailoredText,
    structuredCv,
    tailorNotes: obj.tailorNotes || `Tailored for ${input.jobTitle} at ${input.companyName}.`,
    matchedKeywords: Array.isArray(obj.matchedKeywords) ? obj.matchedKeywords : [],
  };
}

export async function runCandidateChatAgent(input: {
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  candidateName: string;
  profileSummary: string;
  resumes: Array<{ id: string; title: string; kind: string }>;
  availableJobs: Array<{
    id: string;
    title: string;
    companyName: string;
    location: string;
    workplace: string;
    fitLabel: string;
    aiTake: string;
  }>;
  focusedJob?: {
    id: string;
    title: string;
    companyName: string;
    description: string;
    skills: string[];
  } | null;
}): Promise<{
  reply: string;
  action: "none" | "show_picks" | "ask_tailor_role" | "show_tailor_card" | "show_review" | "show_apply_picker";
  targetJobId?: string;
  followUpPrompt?: string;
}> {
  const ai = getGeminiClient();

  const recentHistory = input.history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Candidate" : "Wave Tech"}: ${m.content}`)
    .join("\n");

  const jobsList = input.availableJobs
    .slice(0, 15)
    .map(
      (j) =>
        `- id:${j.id} | ${j.companyName} | ${j.title} | ${j.location} (${j.workplace}) | ${j.fitLabel}`
    )
    .join("\n");

  const resumeList = input.resumes
    .map((r) => `- id:${r.id} | [${r.kind}] ${r.title}`)
    .join("\n");

  const focusedContext = input.focusedJob
    ? `\nCurrently open job in right pane: id:${input.focusedJob.id} | ${input.focusedJob.title} at ${input.focusedJob.companyName}\nSkills: ${input.focusedJob.skills.join(", ")}\nDescription: ${input.focusedJob.description.slice(0, 1200)}`
    : "";

  const prompt = `You are Wave Tech, a crisp, helpful AI career agent (concise, lowercase-friendly conversational tone like a sharp career partner).
Candidate: ${input.candidateName}
Profile & Memory: ${input.profileSummary}

Candidate Resumes:
${resumeList || "(none yet)"}

Top Matched Jobs:
${jobsList || "(no synced jobs yet)"}
${focusedContext}

Conversation so far:
${recentHistory}

Latest message from Candidate: "${input.userMessage}"

Decide the best action:
- "show_picks": when user asks to find jobs, show roles, best jobs, or search for roles.
- "ask_tailor_role": when user asks to tailor their resume without naming a company/role (and no job is clearly specified).
- "show_tailor_card": when user names a company or role to tailor for (match targetJobId from Top Matched Jobs or focusedJob).
- "show_review": when user asks to review or improve their resume.
- "show_apply_picker": when user asks to apply to a specific company or role (e.g. "apply me to software engineer at X"). Match targetJobId from Top Matched Jobs or focusedJob.
- "none": for normal Q&A, interview prep, resume discussion, or general questions.

Return ONLY valid JSON:
{
  "reply": "Short, natural reply text (1-3 sentences)",
  "action": "none" | "show_picks" | "ask_tailor_role" | "show_tailor_card" | "show_review" | "show_apply_picker",
  "targetJobId": "optional matched job id",
  "followUpPrompt": "optional short suggested next prompt like 'Help me prepare for the ... interview'"
}`;

  const response = await traceSlowOperation("gemini_chat_agent", () =>
    withTimeout(
      ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      }),
      30000,
      "Gemini chat response"
    )
  );

  const obj = extractJsonObject(response.text || "{}") as {
    reply?: string;
    action?: "none" | "show_picks" | "ask_tailor_role" | "show_tailor_card" | "show_review" | "show_apply_picker";
    targetJobId?: string;
    followUpPrompt?: string;
  };

  return {
    reply: obj.reply || "Got it — let me look into that for you.",
    action: obj.action || "none",
    targetJobId: obj.targetJobId,
    followUpPrompt: obj.followUpPrompt,
  };
}

export async function* streamChatReplyWithAI(input: {
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  candidateName: string;
  profileSummary: string;
  focusedJob?: {
    title: string;
    companyName: string;
    description: string;
    skills: string[];
  } | null;
}): AsyncGenerator<string> {
  const ai = getGeminiClient();
  const recentHistory = input.history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Candidate" : "Wave Tech"}: ${m.content}`)
    .join("\n");

  const focusedContext = input.focusedJob
    ? `\nFocused job: ${input.focusedJob.title} at ${input.focusedJob.companyName}\nSkills: ${input.focusedJob.skills.join(", ")}\nDescription: ${input.focusedJob.description.slice(0, 1200)}`
    : "";

  const stream = await withTimeout(
    ai.models.generateContentStream({
      model: DEFAULT_GEMINI_MODEL,
      contents: `You are Wave Tech, a crisp, helpful AI career coach. Keep replies concise, practical, and tailored to ${input.candidateName}.
Profile: ${input.profileSummary}${focusedContext}

Recent conversation:
${recentHistory}

Candidate: ${input.userMessage}`,
    }),
    30000,
    "Gemini chat stream"
  );

  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
