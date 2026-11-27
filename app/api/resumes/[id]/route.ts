import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { publicResumeSelect } from "@/lib/resume-queries";

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
      .select(publicResumeSelect)
      .from(schema.resumes)
      .where(
        and(eq(schema.resumes.id, id), eq(schema.resumes.userId, session.user.id))
      )
      .limit(1);

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json({ resume });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
