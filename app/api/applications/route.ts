import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";

const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().optional(),
  action: z.enum(["save", "redirect_apply", "direct_apply", "mark_applied"]).default("save"),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        application: schema.applications,
        job: schema.jobs,
        resume: schema.resumes,
      })
      .from(schema.applications)
      .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .leftJoin(schema.resumes, eq(schema.applications.resumeId, schema.resumes.id))
      .where(eq(schema.applications.userId, session.user.id))
      .orderBy(desc(schema.applications.updatedAt));

    const items = rows.map((r) => ({
      ...r.application,
      job: r.job,
      resume: r.resume,
    }));

    const needsYouCount = items.filter((a) => a.needsStatusConfirm).length;

    return NextResponse.json({ applications: items, needsYouCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tracker.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, resumeId, action, notes } = createApplicationSchema.parse(body);
    const db = getDb();

    const [job] = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, session.user.id),
          eq(schema.applications.jobId, job.id)
        )
      )
      .limit(1);

    const now = new Date();
    const isDirect = action === "direct_apply" && job.directApplySupported;
    const isMarkApplied = action === "mark_applied" || isDirect;
    const isRedirect = action === "redirect_apply" || (action === "direct_apply" && !job.directApplySupported);

    const status = isMarkApplied ? "applied" : "saved";
    const needsStatusConfirm = isRedirect;

    if (existing) {
      const [updated] = await db
        .update(schema.applications)
        .set({
          resumeId: resumeId ?? existing.resumeId,
          status: isMarkApplied ? "applied" : existing.status,
          needsStatusConfirm: isRedirect ? true : isMarkApplied ? false : existing.needsStatusConfirm,
          redirectedAt: isRedirect ? now : existing.redirectedAt,
          appliedAt: isMarkApplied ? now : existing.appliedAt,
          notes: notes ?? existing.notes,
          updatedAt: now,
        })
        .where(eq(schema.applications.id, existing.id))
        .returning();

      return NextResponse.json({
        application: updated,
        redirectUrl: isRedirect ? job.applyUrl : null,
        mode: isDirect ? "direct_sent" : isRedirect ? "redirect" : "saved",
      });
    }

    const [created] = await db
      .insert(schema.applications)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        jobId: job.id,
        resumeId: resumeId ?? null,
        status,
        needsStatusConfirm,
        redirectedAt: isRedirect ? now : null,
        appliedAt: isMarkApplied ? now : null,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json({
      application: created,
      redirectUrl: isRedirect ? job.applyUrl : null,
      mode: isDirect ? "direct_sent" : isRedirect ? "redirect" : "saved",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid application payload", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to save application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
