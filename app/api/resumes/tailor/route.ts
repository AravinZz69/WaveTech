import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { tailorResumeWithAI } from "@/lib/ai";
import { buildPdfFileName, generateTailoredResumePdf } from "@/lib/resume-pdf";
import { publicResumeSelect } from "@/lib/resume-queries";

const tailorRequestSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().optional(),
  intensity: z.enum(["light", "balanced", "deep"]).default("balanced"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, resumeId, intensity } = tailorRequestSchema.parse(body);
    const db = getDb();

    const [job] = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Target job not found." }, { status: 404 });
    }

    let sourceResume;
    if (resumeId) {
      [sourceResume] = await db
        .select()
        .from(schema.resumes)
        .where(and(eq(schema.resumes.id, resumeId), eq(schema.resumes.userId, session.user.id)))
        .limit(1);
    } else {
      [sourceResume] = await db
        .select()
        .from(schema.resumes)
        .where(and(eq(schema.resumes.userId, session.user.id), eq(schema.resumes.kind, "original")))
        .orderBy(desc(schema.resumes.isDefault), desc(schema.resumes.createdAt))
        .limit(1);
    }

    if (!sourceResume) {
      return NextResponse.json(
        { error: "Please upload an original resume first before tailoring." },
        { status: 400 }
      );
    }

    const tailored = await tailorResumeWithAI({
      resumeText: sourceResume.rawText,
      jobTitle: job.title,
      companyName: job.companyName,
      jobDescription: job.description,
      jobSkills: job.skills,
      intensity,
    });

    const title = `${job.title} — ${job.companyName}`;
    const pdfFileName = buildPdfFileName(job.companyName, job.title);
    const pdfBuffer = await generateTailoredResumePdf({
      title,
      tailoredText: tailored.tailoredText,
      candidateName: sourceResume.parsedJson?.fullName || session.user.name,
      companyName: job.companyName,
      jobTitle: job.title,
    });

    const [created] = await db
      .insert(schema.resumes)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        kind: "tailored",
        title,
        fileName: pdfFileName,
        mimeType: "application/pdf",
        fileSizeBytes: pdfBuffer.byteLength,
        pdfBase64: pdfBuffer.toString("base64"),
        rawText: tailored.tailoredText,
        parsedJson: sourceResume.parsedJson,
        tailoredForJobId: job.id,
        tailorIntensity: intensity,
        tailorNotes: tailored.tailorNotes,
        isDefault: false,
      })
      .returning(publicResumeSelect);

    // Upsert tracker entry to ready_to_apply if not already applied/interview/offer
    const [existingApp] = await db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, session.user.id),
          eq(schema.applications.jobId, job.id)
        )
      )
      .limit(1);

    if (!existingApp) {
      await db.insert(schema.applications).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        jobId: job.id,
        resumeId: created.id,
        status: "ready_to_apply",
        needsStatusConfirm: false,
      });
    } else if (existingApp.status === "saved") {
      await db
        .update(schema.applications)
        .set({
          resumeId: created.id,
          status: "ready_to_apply",
          updatedAt: new Date(),
        })
        .where(eq(schema.applications.id, existingApp.id));
    }

    return NextResponse.json({
      resume: { ...created, hasPdf: true },
      pdfDownloadUrl: `/api/resumes/${created.id}/pdf`,
      matchedKeywords: tailored.matchedKeywords,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tailor request", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to tailor resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
