import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { getDb, schema } from "@/db";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile Setup",
  description:
    "Upload your resume and configure your target roles, skills, locations, and pay expectations on Wave Tech.",
};

export default async function SignupPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.candidateProfiles)
    .where(eq(schema.candidateProfiles.userId, session.user.id))
    .limit(1);

  const userResumes = await db
    .select({
      id: schema.resumes.id,
      fileName: schema.resumes.fileName,
      kind: schema.resumes.kind,
    })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, session.user.id))
    .orderBy(desc(schema.resumes.createdAt));

  return (
    <OnboardingFlow
      initialProfile={{
        categories: profile?.categories ?? [],
        roles: profile?.roles ?? [],
        skills: profile?.skills ?? [],
        githubUrl: profile?.githubUrl ?? null,
        portfolioUrl: profile?.portfolioUrl ?? null,
        stage: profile?.stage ?? "Graduate",
        experienceYears: profile?.experienceYears ?? 0,
        locations: profile?.locations ?? ["India"],
        cities: profile?.cities ?? [],
        workplace: profile?.workplace ?? ["Remote", "Hybrid"],
        jobTypes: profile?.jobTypes ?? ["Full-time", "Internship"],
        searchStatus: profile?.searchStatus ?? "Actively looking",
        noticePeriod: profile?.noticePeriod ?? "Immediately",
        currentPayAmount: profile?.currentPayAmount ?? null,
        currentPayCurrency: profile?.currentPayCurrency ?? "INR",
        currentPayPeriod: profile?.currentPayPeriod ?? "Yearly",
        expectedPayAmount: profile?.expectedPayAmount ?? null,
        expectedPayCurrency: profile?.expectedPayCurrency ?? "INR",
        expectedPayPeriod: profile?.expectedPayPeriod ?? "Yearly",
      }}
      initialResumes={userResumes}
    />
  );
}
