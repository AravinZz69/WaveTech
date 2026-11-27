import type { Metadata } from "next";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { getDb, schema } from "@/db";
import { ensureFreshJobsCatalog } from "@/lib/job-sync";
import { scoreJobForCandidate } from "@/lib/matching";
import { CandidateWorkspace } from "@/components/workspace/CandidateWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Chat with Wave Tech, explore matched job picks, tailor resumes per role, and track applications.",
};

function computeNeedsDailyCheckIn(
  pendingLength: number,
  lastStatusCheckAt: Date | null
): boolean {
  if (pendingLength === 0) return false;
  if (!lastStatusCheckAt) return true;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Date.now() - lastStatusCheckAt.getTime() > oneDayMs;
}

export default async function ChatPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const db = getDb();

  let [profile] = await db
    .select()
    .from(schema.candidateProfiles)
    .where(eq(schema.candidateProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    const [created] = await db
      .insert(schema.candidateProfiles)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
      })
      .returning();
    profile = created;
  }

  try {
    await ensureFreshJobsCatalog();
  } catch {
    // Non-fatal on initial load if offline or external board temporarily unreachable
  }

  const [userResumes, allJobs, appRows, messages, historyRows, pendingCount] = await Promise.all([
    db
      .select({
        id: schema.resumes.id,
        kind: schema.resumes.kind,
        title: schema.resumes.title,
        fileName: schema.resumes.fileName,
        mimeType: schema.resumes.mimeType,
        fileSizeBytes: schema.resumes.fileSizeBytes,
        rawText: schema.resumes.rawText,
        parsedJson: schema.resumes.parsedJson,
        tailoredForJobId: schema.resumes.tailoredForJobId,
        tailorIntensity: schema.resumes.tailorIntensity,
        tailorNotes: schema.resumes.tailorNotes,
        isDefault: schema.resumes.isDefault,
        createdAt: schema.resumes.createdAt,
      })
      .from(schema.resumes)
      .where(eq(schema.resumes.userId, session.user.id))
      .orderBy(desc(schema.resumes.createdAt)),
    db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.isActive, true))
      .orderBy(desc(schema.jobs.postedAt))
      .limit(80),
    db
      .select({
        application: schema.applications,
        job: schema.jobs,
        resume: schema.resumes,
      })
      .from(schema.applications)
      .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .leftJoin(schema.resumes, eq(schema.applications.resumeId, schema.resumes.id))
      .where(eq(schema.applications.userId, session.user.id))
      .orderBy(desc(schema.applications.updatedAt)),
    db
      .select({
        id: schema.chatMessages.id,
        role: schema.chatMessages.role,
        content: schema.chatMessages.content,
        metadata: schema.chatMessages.metadata,
        createdAt: schema.chatMessages.createdAt,
      })
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, session.user.id))
      .orderBy(asc(schema.chatMessages.createdAt))
      .limit(50),
    db
      .select({
        id: schema.searchHistory.id,
        query: schema.searchHistory.query,
        resultCount: schema.searchHistory.resultCount,
        createdAt: schema.searchHistory.createdAt,
      })
      .from(schema.searchHistory)
      .where(eq(schema.searchHistory.userId, session.user.id))
      .orderBy(desc(schema.searchHistory.createdAt))
      .limit(20),
    db
      .select({ id: schema.applications.id })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, session.user.id),
          eq(schema.applications.needsStatusConfirm, true)
        )
      ),
  ]);

  const matchProfile = {
    roles: profile.roles,
    skills: profile.skills,
    workplace: profile.workplace,
    cities: profile.cities,
    jobTypes: profile.jobTypes,
    experienceYears: profile.experienceYears,
    expectedPayAmount: profile.expectedPayAmount,
    expectedPayCurrency: profile.expectedPayCurrency,
  };

  const scoredJobs = allJobs
    .map((job) => ({
      ...job,
      postedAt: job.postedAt.toISOString(),
      syncedAt: job.syncedAt.toISOString(),
      match: scoreJobForCandidate(job, matchProfile),
    }))
    .sort((a, b) => b.match.score - a.match.score);

  const needsDailyCheckIn = computeNeedsDailyCheckIn(
    pendingCount.length,
    profile.lastStatusCheckAt
  );

  return (
    <CandidateWorkspace
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
      initialProfile={profile}
      initialResumes={userResumes.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      initialJobs={scoredJobs}
      initialApplications={appRows.map((r) => ({
        ...r.application,
        redirectedAt: r.application.redirectedAt?.toISOString() ?? null,
        appliedAt: r.application.appliedAt?.toISOString() ?? null,
        updatedAt: r.application.updatedAt.toISOString(),
        job: {
          ...r.job,
          postedAt: r.job.postedAt.toISOString(),
        },
        resume: r.resume
          ? { ...r.resume, createdAt: r.resume.createdAt.toISOString() }
          : null,
      }))}
      initialMessages={messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
      initialSearchHistory={historyRows.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      }))}
      initialNeedsDailyCheckIn={needsDailyCheckIn}
    />
  );
}
