import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getServerSession } from "@/lib/session";

const patchSchema = z.object({
  status: z.enum(["saved", "ready_to_apply", "applied", "interview", "offer", "closed"]).optional(),
  needsStatusConfirm: z.boolean().optional(),
  resumeId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = patchSchema.parse(body);
    const db = getDb();

    const [updated] = await db
      .update(schema.applications)
      .set({
        ...parsed,
        ...(parsed.status === "applied" ? { appliedAt: new Date(), needsStatusConfirm: false } : {}),
        ...(parsed.status === "closed" ? { needsStatusConfirm: false } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.applications.id, id),
          eq(schema.applications.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid update payload", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    await db
      .delete(schema.applications)
      .where(
        and(
          eq(schema.applications.id, id),
          eq(schema.applications.userId, session.user.id)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
