import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";
import { publicResumeSelect } from "@/lib/resume-queries";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const list = await db
      .select(publicResumeSelect)
      .from(schema.resumes)
      .where(eq(schema.resumes.userId, session.user.id))
      .orderBy(desc(schema.resumes.createdAt));

    return NextResponse.json({ resumes: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load resumes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
