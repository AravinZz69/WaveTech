import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { extractResumeRawText, validateResumeFile } from "@/lib/resume-extract";
import { parseResumeWithAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing resume file under form field "file".' },
        { status: 400 }
      );
    }

    const validation = validateResumeFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { rawText } = await extractResumeRawText(buffer, file.type, file.name);
    const { parsed, extractedText } = await parseResumeWithAI({
      rawText,
      fileBuffer: buffer,
      mimeType: file.type || "application/pdf",
    });

    const db = getDb();
    const resumeId = crypto.randomUUID();

    // Mark prior original resumes non-default if this is the new primary upload
    await db
      .update(schema.resumes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(schema.resumes.userId, session.user.id));

    const [createdResume] = await db
      .insert(schema.resumes)
      .values({
        id: resumeId,
        userId: session.user.id,
        kind: "original",
        title: file.name,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        fileSizeBytes: file.size,
        rawText: extractedText || rawText || file.name,
        parsedJson: parsed,
        isDefault: true,
      })
      .returning();

    const memorySummary = [
      parsed.headline || parsed.roles.join(", "),
      parsed.skills.length ? `Skills: ${parsed.skills.slice(0, 12).join(", ")}` : "",
      parsed.summary || "",
    ]
      .filter(Boolean)
      .join(" · ");

    const [existingProfile] = await db
      .select()
      .from(schema.candidateProfiles)
      .where(eq(schema.candidateProfiles.userId, session.user.id))
      .limit(1);

    const profilePayload = {
      categories: parsed.categories.length > 0 ? parsed.categories : existingProfile?.categories ?? [],
      roles: parsed.roles.length > 0 ? parsed.roles : existingProfile?.roles ?? [],
      skills: parsed.skills.length > 0 ? parsed.skills : existingProfile?.skills ?? [],
      experienceYears: parsed.experienceYears ?? existingProfile?.experienceYears ?? 0,
      stage: parsed.stage || existingProfile?.stage || "Graduate",
      githubUrl: parsed.githubUrl || existingProfile?.githubUrl || null,
      portfolioUrl: parsed.portfolioUrl || existingProfile?.portfolioUrl || null,
      memorySummary,
      updatedAt: new Date(),
    };

    let profile;
    if (!existingProfile) {
      const [inserted] = await db
        .insert(schema.candidateProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          ...profilePayload,
        })
        .returning();
      profile = inserted;
    } else {
      const [updated] = await db
        .update(schema.candidateProfiles)
        .set(profilePayload)
        .where(eq(schema.candidateProfiles.userId, session.user.id))
        .returning();
      profile = updated;
    }

    return NextResponse.json({
      resume: createdResume,
      profile,
      suggestions: parsed.improvementSuggestions ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
