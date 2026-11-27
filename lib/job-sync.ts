import crypto from "node:crypto";
import { desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { COMMON_SKILLS } from "./constants";
import { traceSlowOperation } from "./telemetry";

export interface NormalizedExternalJob {
  externalId: string;
  source: string;
  companyName: string;
  companyLogoUrl: string | null;
  companyDomain: string | null;
  companySize: string | null;
  companyFunding: string | null;
  businessModel: string | null;
  customerType: string | null;
  title: string;
  location: string;
  workplace: "Remote" | "Hybrid" | "On-site";
  jobType: "Full-time" | "Internship" | "Part-time" | "Freelance";
  minExperience: number;
  maxExperience: number | null;
  payDisplay: string;
  description: string;
  highlights: string[];
  skills: string[];
  applyUrl: string;
  directApplySupported: boolean;
  aiTake: string;
  activeHiringCount: number;
  postedAt: Date;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const matched = COMMON_SKILLS.filter((skill) => {
    const s = skill.toLowerCase();
    return lower.includes(s);
  });
  return Array.from(new Set(matched)).slice(0, 8);
}

function inferJobType(title: string, rawType?: string): NormalizedExternalJob["jobType"] {
  const combined = `${title} ${rawType || ""}`.toLowerCase();
  if (combined.includes("intern")) return "Internship";
  if (combined.includes("part-time") || combined.includes("part time")) return "Part-time";
  if (combined.includes("contract") || combined.includes("freelance")) return "Freelance";
  return "Full-time";
}

function inferWorkplace(location: string, remoteFlag?: boolean): NormalizedExternalJob["workplace"] {
  const lower = location.toLowerCase();
  if (remoteFlag || lower.includes("remote") || lower.includes("anywhere") || lower.includes("worldwide")) {
    return "Remote";
  }
  if (lower.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function buildAiTake(title: string, skills: string[], workplace: string): string {
  if (skills.length >= 2) {
    return `${title} focuses on ${skills.slice(0, 3).join(", ")} in a ${workplace.toLowerCase()} setup.`;
  }
  return `${title} role in a ${workplace.toLowerCase()} environment.`;
}

function buildHighlights(description: string): string[] {
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 160);
  return sentences.slice(0, 4);
}

async function fetchRemotiveJobs(): Promise<NormalizedExternalJob[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs?limit=25", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`Remotive API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      title: string;
      company_name: string;
      company_logo?: string;
      category?: string;
      tags?: string[];
      job_type?: string;
      publication_date?: string;
      candidate_required_location?: string;
      salary?: string;
      description?: string;
    }>;
  };

  return (data.jobs || []).map((job) => {
    const cleanDesc = stripHtml(job.description || "");
    const tagSkills = (job.tags || []).slice(0, 6);
    const detectedSkills =
      tagSkills.length > 0 ? tagSkills : extractSkillsFromText(`${job.title} ${cleanDesc}`);
    const workplace = "Remote" as const;
    return {
      externalId: `remotive-${job.id}`,
      source: "remotive",
      companyName: job.company_name || "Unknown Company",
      companyLogoUrl: job.company_logo || null,
      companyDomain: null,
      companySize: "Mid-size",
      companyFunding: "Other funded",
      businessModel: "Product",
      customerType: "B2B",
      title: job.title,
      location: job.candidate_required_location || "Remote",
      workplace,
      jobType: inferJobType(job.title, job.job_type),
      minExperience: job.title.toLowerCase().includes("intern") ? 0 : 1,
      maxExperience: job.title.toLowerCase().includes("senior") ? 8 : 4,
      payDisplay: job.salary?.trim() || "Not listed",
      description: cleanDesc.slice(0, 4000),
      highlights: buildHighlights(cleanDesc),
      skills: detectedSkills,
      applyUrl: job.url,
      directApplySupported: false,
      aiTake: buildAiTake(job.title, detectedSkills, workplace),
      activeHiringCount: 3,
      postedAt: job.publication_date ? new Date(job.publication_date) : new Date(),
    };
  });
}

async function fetchArbeitnowJobs(): Promise<NormalizedExternalJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`Arbeitnow API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: Array<{
      slug: string;
      company_name: string;
      title: string;
      description: string;
      remote: boolean;
      url: string;
      tags?: string[];
      job_types?: string[];
      location: string;
      created_at: number;
    }>;
  };

  return (data.data || []).slice(0, 25).map((job) => {
    const cleanDesc = stripHtml(job.description || "");
    const tagSkills = (job.tags || []).slice(0, 6);
    const detectedSkills =
      tagSkills.length > 0 ? tagSkills : extractSkillsFromText(`${job.title} ${cleanDesc}`);
    const workplace = inferWorkplace(job.location || "", job.remote);
    return {
      externalId: `arbeitnow-${job.slug}`,
      source: "arbeitnow",
      companyName: job.company_name || "Unknown Company",
      companyLogoUrl: null,
      companyDomain: null,
      companySize: "Startup",
      companyFunding: "Early stage",
      businessModel: "Product",
      customerType: "B2B",
      title: job.title,
      location: job.location || (job.remote ? "Remote" : "Global"),
      workplace,
      jobType: inferJobType(job.title, job.job_types?.[0]),
      minExperience: job.title.toLowerCase().includes("intern") ? 0 : 1,
      maxExperience: 5,
      payDisplay: "Not listed",
      description: cleanDesc.slice(0, 4000),
      highlights: buildHighlights(cleanDesc),
      skills: detectedSkills,
      applyUrl: job.url,
      directApplySupported: false,
      aiTake: buildAiTake(job.title, detectedSkills, workplace),
      activeHiringCount: 2,
      postedAt: job.created_at ? new Date(job.created_at * 1000) : new Date(),
    };
  });
}

async function fetchJSearchJobs(): Promise<NormalizedExternalJob[]> {
  const apiKey = process.env.RAPIDAPI_JSEARCH_KEY;
  if (!apiKey) return [];

  const res = await fetch(
    "https://jsearch.p.rapidapi.com/search?query=software%20engineer%20OR%20AI%20engineer%20in%20India&num_pages=1",
    {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!res.ok) {
    throw new Error(`JSearch API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: Array<{
      job_id: string;
      employer_name: string;
      employer_logo?: string | null;
      employer_website?: string | null;
      job_title: string;
      job_description: string;
      job_apply_link: string;
      job_is_remote?: boolean;
      job_employment_type?: string;
      job_city?: string;
      job_country?: string;
      job_posted_at_timestamp?: number;
      job_required_skills?: string[] | null;
    }>;
  };

  return (data.data || []).map((job) => {
    const cleanDesc = stripHtml(job.job_description || "");
    const detectedSkills =
      job.job_required_skills && job.job_required_skills.length > 0
        ? job.job_required_skills.slice(0, 8)
        : extractSkillsFromText(`${job.job_title} ${cleanDesc}`);
    const location =
      [job.job_city, job.job_country].filter(Boolean).join(", ") ||
      (job.job_is_remote ? "Remote" : "India");
    const workplace = inferWorkplace(location, job.job_is_remote);
    return {
      externalId: `jsearch-${job.job_id}`,
      source: "jsearch",
      companyName: job.employer_name || "Unknown Company",
      companyLogoUrl: job.employer_logo || null,
      companyDomain: job.employer_website || null,
      companySize: null,
      companyFunding: null,
      businessModel: null,
      customerType: null,
      title: job.job_title,
      location,
      workplace,
      jobType: inferJobType(job.job_title, job.job_employment_type),
      minExperience: 0,
      maxExperience: 5,
      payDisplay: "Not listed",
      description: cleanDesc.slice(0, 4000),
      highlights: buildHighlights(cleanDesc),
      skills: detectedSkills,
      applyUrl: job.job_apply_link,
      directApplySupported: false,
      aiTake: buildAiTake(job.job_title, detectedSkills, workplace),
      activeHiringCount: 4,
      postedAt: job.job_posted_at_timestamp
        ? new Date(job.job_posted_at_timestamp * 1000)
        : new Date(),
    };
  });
}

async function fetchRemoteOkJobs(): Promise<NormalizedExternalJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: {
      Accept: "application/json",
      "User-Agent": "WaveTechCareerAgent/1.0",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`RemoteOK API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    id?: string | number;
    slug?: string;
    epoch?: number;
    date?: string;
    company?: string;
    company_logo?: string;
    logo?: string;
    position?: string;
    tags?: string[];
    description?: string;
    location?: string;
    apply_url?: string;
    url?: string;
    salary_min?: number;
    salary_max?: number;
  }>;

  // Index 0 in RemoteOK API response is a legal metadata notice object
  return (Array.isArray(data) ? data : [])
    .filter((job) => Boolean(job?.id && job?.position && job?.company))
    .slice(0, 20)
    .map((job) => {
      const cleanDesc = stripHtml(job.description || "");
      const tagSkills = (job.tags || []).slice(0, 6);
      const detectedSkills =
        tagSkills.length > 0 ? tagSkills : extractSkillsFromText(`${job.position} ${cleanDesc}`);
      const payDisplay =
        job.salary_min && job.salary_max
          ? `$${Math.round(job.salary_min / 1000)}K–$${Math.round(job.salary_max / 1000)}K`
          : "Not listed";
      const title = job.position || "Software Engineer";
      return {
        externalId: `remoteok-${job.id}`,
        source: "remoteok",
        companyName: job.company || "Unknown Company",
        companyLogoUrl: job.company_logo || job.logo || null,
        companyDomain: null,
        companySize: "Startup",
        companyFunding: "Other funded",
        businessModel: "Product",
        customerType: "B2B",
        title,
        location: job.location || "Remote",
        workplace: "Remote" as const,
        jobType: inferJobType(title),
        minExperience: title.toLowerCase().includes("intern") ? 0 : 1,
        maxExperience: 5,
        payDisplay,
        description: cleanDesc.slice(0, 4000),
        highlights: buildHighlights(cleanDesc),
        skills: detectedSkills,
        applyUrl: job.apply_url || job.url || "https://remoteok.com",
        directApplySupported: false,
        aiTake: buildAiTake(title, detectedSkills, "Remote"),
        activeHiringCount: 2,
        postedAt: job.date ? new Date(job.date) : new Date(),
      };
    });
}

async function fetchJobicyJobs(): Promise<NormalizedExternalJob[]> {
  const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=20", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`Jobicy API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      jobTitle: string;
      companyName: string;
      companyLogo?: string;
      jobType?: string[];
      jobGeo?: string;
      jobLevel?: string;
      jobExcerpt?: string;
      jobDescription?: string;
      pubDate?: string;
    }>;
  };

  return (data.jobs || []).map((job) => {
    const cleanDesc = stripHtml(job.jobDescription || job.jobExcerpt || "");
    const detectedSkills = extractSkillsFromText(`${job.jobTitle} ${cleanDesc}`);
    return {
      externalId: `jobicy-${job.id}`,
      source: "jobicy",
      companyName: job.companyName || "Unknown Company",
      companyLogoUrl: job.companyLogo || null,
      companyDomain: null,
      companySize: "Mid-size",
      companyFunding: "Other funded",
      businessModel: "Product",
      customerType: "B2B",
      title: job.jobTitle,
      location: job.jobGeo || "Anywhere",
      workplace: "Remote" as const,
      jobType: inferJobType(job.jobTitle, job.jobType?.[0]),
      minExperience: job.jobLevel?.toLowerCase().includes("senior") ? 3 : 0,
      maxExperience: 5,
      payDisplay: "Not listed",
      description: cleanDesc.slice(0, 4000),
      highlights: buildHighlights(cleanDesc),
      skills: detectedSkills,
      applyUrl: job.url,
      directApplySupported: false,
      aiTake: buildAiTake(job.jobTitle, detectedSkills, "Remote"),
      activeHiringCount: 2,
      postedAt: job.pubDate ? new Date(job.pubDate) : new Date(),
    };
  });
}

export async function syncExternalJobs(): Promise<{
  fetched: number;
  upserted: number;
  sources: Array<{ source: string; fetched: number; status: "success" | "error"; error?: string }>;
}> {
  const db = getDb();
  const sources: Array<{
    source: string;
    fetched: number;
    status: "success" | "error";
    error?: string;
  }> = [];

  const fetchers: Array<{ name: string; run: () => Promise<NormalizedExternalJob[]> }> = [
    { name: "remotive", run: fetchRemotiveJobs },
    { name: "arbeitnow", run: fetchArbeitnowJobs },
    { name: "remoteok", run: fetchRemoteOkJobs },
    { name: "jobicy", run: fetchJobicyJobs },
  ];
  if (process.env.RAPIDAPI_JSEARCH_KEY) {
    fetchers.push({ name: "jsearch", run: fetchJSearchJobs });
  }

  const results = await Promise.allSettled(
    fetchers.map(async (fetcher) => {
      const items = await traceSlowOperation(`job_fetch_${fetcher.name}`, fetcher.run, 4000);
      return { name: fetcher.name, items };
    })
  );

  let totalFetched = 0;
  let totalUpserted = 0;
  const logRows: Array<typeof schema.syncLogs.$inferInsert> = [];

  for (let i = 0; i < results.length; i++) {
    const fetcher = fetchers[i];
    const settled = results[i];

    if (settled.status === "fulfilled") {
      const { items } = settled.value;
      totalFetched += items.length;

      if (items.length > 0) {
        await traceSlowOperation(`job_batch_upsert_${fetcher.name}`, () =>
          db
            .insert(schema.jobs)
            .values(
              items.map((item) => ({
                id: crypto.randomUUID(),
                ...item,
                syncedAt: new Date(),
                isActive: true,
              }))
            )
            .onConflictDoUpdate({
              target: schema.jobs.externalId,
              set: {
                title: sql`excluded.title`,
                companyName: sql`excluded.company_name`,
                companyLogoUrl: sql`excluded.company_logo_url`,
                location: sql`excluded.location`,
                workplace: sql`excluded.workplace`,
                jobType: sql`excluded.job_type`,
                payDisplay: sql`excluded.pay_display`,
                description: sql`excluded.description`,
                highlights: sql`excluded.highlights`,
                skills: sql`excluded.skills`,
                applyUrl: sql`excluded.apply_url`,
                aiTake: sql`excluded.ai_take`,
                syncedAt: new Date(),
                isActive: true,
              },
            })
        );
      }

      totalUpserted += items.length;
      sources.push({ source: fetcher.name, fetched: items.length, status: "success" });
      logRows.push({
        id: crypto.randomUUID(),
        source: fetcher.name,
        jobsFetched: items.length,
        jobsUpserted: items.length,
        status: "success",
      });
    } else {
      const msg =
        settled.reason instanceof Error ? settled.reason.message : "Unknown sync error";
      sources.push({ source: fetcher.name, fetched: 0, status: "error", error: msg });
      logRows.push({
        id: crypto.randomUUID(),
        source: fetcher.name,
        jobsFetched: 0,
        jobsUpserted: 0,
        status: "error",
        errorMessage: msg,
      });
    }
  }

  if (logRows.length > 0) {
    await db.insert(schema.syncLogs).values(logRows);
  }

  return { fetched: totalFetched, upserted: totalUpserted, sources };
}

let refreshInFlight: Promise<unknown> | null = null;

export async function ensureFreshJobsCatalog(): Promise<void> {
  const db = getDb();
  const latest = await db
    .select({ syncedAt: schema.jobs.syncedAt })
    .from(schema.jobs)
    .orderBy(desc(schema.jobs.syncedAt))
    .limit(1);

  const fourHoursMs = 4 * 60 * 60 * 1000;
  if (latest.length === 0) {
    await syncExternalJobs();
    return;
  }

  const isStale = Date.now() - latest[0].syncedAt.getTime() > fourHoursMs;
  if (isStale && !refreshInFlight) {
    // Refresh stale catalog asynchronously in the background so page/API response is instant
    refreshInFlight = syncExternalJobs().finally(() => {
      refreshInFlight = null;
    });
  }
}
