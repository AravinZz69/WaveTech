import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { generateTailoredResumePdf } from "@/lib/resume-pdf";

function safePdfDownloadName(fileName: string, title: string): string {
  const base = (fileName || title || "Tailored_Resume")
    .replace(/\.(md|txt|docx?|pdf)$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "Tailored_Resume"}.pdf`;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();
    const [resume] = await db
      .select()
      .from(schema.resumes)
      .where(and(eq(schema.resumes.id, id), eq(schema.resumes.userId, session.user.id)))
      .limit(1);

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    if (resume.kind !== "tailored") {
      return NextResponse.json(
        { error: "PDF download is only available after tailoring your resume for a role." },
        { status: 403 }
      );
    }

    let pdfBuffer: Buffer;
    if (resume.pdfBase64) {
      pdfBuffer = Buffer.from(resume.pdfBase64, "base64");
    } else {
      // Backfill earlier tailored rows so every tailored resume serves a stored PDF
      pdfBuffer = await generateTailoredResumePdf({
        title: resume.title,
        tailoredText: resume.rawText,
        candidateName: resume.parsedJson?.fullName || session.user.name,
      });

      const downloadName = safePdfDownloadName(resume.fileName, resume.title);
      await db
        .update(schema.resumes)
        .set({
          fileName: downloadName,
          mimeType: "application/pdf",
          fileSizeBytes: pdfBuffer.byteLength,
          pdfBase64: pdfBuffer.toString("base64"),
          updatedAt: new Date(),
        })
        .where(eq(schema.resumes.id, resume.id));
    }

    const downloadName = safePdfDownloadName(resume.fileName, resume.title);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to download tailored PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
