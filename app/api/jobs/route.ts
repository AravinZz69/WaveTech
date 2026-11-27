import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { ensureFreshJobsCatalog } from "@/lib/job-sync";
import { scoreJobForCandidate } from "@/lib/matching";
import { traceSlowOperation } from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureFreshJobsCatalog();

    const db = getDb();
    const query = req.nextUrl.searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(80, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "40")));

    const [[profile], allJobs] = await traceSlowOperation("api_jobs_query", () =>
      Promise.all([
        db
          .select({
            roles: schema.candidateProfiles.roles,
            skills: schema.candidateProfiles.skills,
            workplace: schema.candidateProfiles.workplace,
            cities: schema.candidateProfiles.cities,
            jobTypes: schema.candidateProfiles.jobTypes,
            experienceYears: schema.candidateProfiles.experienceYears,
            expectedPayAmount: schema.candidateProfiles.expectedPayAmount,
            expectedPayCurrency: schema.candidateProfiles.expectedPayCurrency,
          })
          .from(schema.candidateProfiles)
          .where(eq(schema.candidateProfiles.userId, session.user.id))
          .limit(1),
        db
          .select({
            id: schema.jobs.id,
            externalId: schema.jobs.externalId,
            source: schema.jobs.source,
            companyName: schema.jobs.companyName,
            companyLogoUrl: schema.jobs.companyLogoUrl,
            companyDomain: schema.jobs.companyDomain,
            companySize: schema.jobs.companySize,
            companyFunding: schema.jobs.companyFunding,
            businessModel: schema.jobs.businessModel,
            customerType: schema.jobs.customerType,
            title: schema.jobs.title,
            location: schema.jobs.location,
            workplace: schema.jobs.workplace,
            jobType: schema.jobs.jobType,
            minExperience: schema.jobs.minExperience,
            maxExperience: schema.jobs.maxExperience,
            payDisplay: schema.jobs.payDisplay,
            description: schema.jobs.description,
            highlights: schema.jobs.highlights,
            skills: schema.jobs.skills,
            applyUrl: schema.jobs.applyUrl,
            directApplySupported: schema.jobs.directApplySupported,
            aiTake: schema.jobs.aiTake,
            activeHiringCount: schema.jobs.activeHiringCount,
            postedAt: schema.jobs.postedAt,
          })
          .from(schema.jobs)
          .where(eq(schema.jobs.isActive, true))
          .orderBy(desc(schema.jobs.postedAt))
          .limit(120),
      ])
    );

    const matchProfile = {
      roles: profile?.roles ?? [],
      skills: profile?.skills ?? [],
      workplace: profile?.workplace ?? [],
      cities: profile?.cities ?? [],
      jobTypes: profile?.jobTypes ?? [],
      experienceYears: profile?.experienceYears ?? 0,
      expectedPayAmount: profile?.expectedPayAmount ?? null,
      expectedPayCurrency: profile?.expectedPayCurrency ?? null,
    };

    const qLower = query.toLowerCase();
    const filtered = qLower
      ? allJobs.filter(
          (j) =>
            j.title.toLowerCase().includes(qLower) ||
            j.companyName.toLowerCase().includes(qLower) ||
            j.location.toLowerCase().includes(qLower) ||
            j.skills.some((s) => s.toLowerCase().includes(qLower))
        )
      : allJobs;

    const scored = filtered
      .map((job) => ({
        ...job,
        match: scoreJobForCandidate(job, matchProfile),
      }))
      .sort((a, b) => b.match.score - a.match.score);

    const total = scored.length;
    const start = (page - 1) * limit;
    const paginated = scored.slice(start, start + limit);

    if (query) {
      await db.insert(schema.searchHistory).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        query,
        filtersSnapshot: {
          roles: matchProfile.roles,
          workplace: matchProfile.workplace,
          cities: matchProfile.cities,
        },
        resultCount: total,
      });
    }

    return NextResponse.json({
      jobs: paginated,
      page,
      limit,
      total,
      hasMore: start + paginated.length < total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load jobs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
