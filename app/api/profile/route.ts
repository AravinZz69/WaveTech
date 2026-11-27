import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";

const updateProfileSchema = z.object({
  categories: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  githubUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  stage: z.enum(["Student", "Graduate", "Working"]).optional(),
  experienceYears: z.number().int().min(0).max(40).optional(),
  locations: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  workplace: z.array(z.string()).optional(),
  jobTypes: z.array(z.string()).optional(),
  searchStatus: z.enum(["Actively looking", "Open to offers", "Not looking"]).optional(),
  noticePeriod: z.string().optional(),
  currentPayAmount: z.number().int().nullable().optional(),
  currentPayCurrency: z.enum(["INR", "USD"]).optional(),
  currentPayPeriod: z.enum(["Yearly", "Monthly"]).optional(),
  expectedPayAmount: z.number().int().nullable().optional(),
  expectedPayCurrency: z.enum(["INR", "USD"]).optional(),
  expectedPayPeriod: z.enum(["Yearly", "Monthly"]).optional(),
  companySizes: z.array(z.string()).optional(),
  fundingStages: z.array(z.string()).optional(),
  businessModels: z.array(z.string()).optional(),
  customerTypes: z.array(z.string()).optional(),
  memorySummary: z.string().nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  acknowledgeDailyCheckIn: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const userResumes = await db
      .select()
      .from(schema.resumes)
      .where(eq(schema.resumes.userId, session.user.id))
      .orderBy(desc(schema.resumes.createdAt));

    const pendingConfirmations = await db
      .select({ id: schema.applications.id })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, session.user.id),
          eq(schema.applications.needsStatusConfirm, true)
        )
      );

    const oneDayMs = 24 * 60 * 60 * 1000;
    const needsDailyCheckIn =
      pendingConfirmations.length > 0 &&
      (!profile.lastStatusCheckAt ||
        Date.now() - profile.lastStatusCheckAt.getTime() > oneDayMs);

    return NextResponse.json({
      user: session.user,
      profile,
      resumes: userResumes,
      pendingConfirmCount: pendingConfirmations.length,
      needsDailyCheckIn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);
    const db = getDb();

    const { acknowledgeDailyCheckIn, ...fields } = parsed;

    const updatePayload = {
      ...fields,
      ...(acknowledgeDailyCheckIn ? { lastStatusCheckAt: new Date() } : {}),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.candidateProfiles.id })
      .from(schema.candidateProfiles)
      .where(eq(schema.candidateProfiles.userId, session.user.id))
      .limit(1);

    if (!existing) {
      const [created] = await db
        .insert(schema.candidateProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          ...updatePayload,
        })
        .returning();
      return NextResponse.json({ profile: created });
    }

    const [updated] = await db
      .update(schema.candidateProfiles)
      .set(updatePayload)
      .where(eq(schema.candidateProfiles.userId, session.user.id))
      .returning();

    return NextResponse.json({ profile: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid profile data", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
