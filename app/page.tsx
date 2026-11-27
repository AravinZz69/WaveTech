import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  try {
    const db = getDb();
    const [profile] = await db
      .select({ onboardingCompleted: schema.candidateProfiles.onboardingCompleted })
      .from(schema.candidateProfiles)
      .where(eq(schema.candidateProfiles.userId, session.user.id))
      .limit(1);

    if (profile?.onboardingCompleted) {
      redirect("/chat");
    }
  } catch {
    // If DB isn't migrated yet, fall back to /signup
  }

  redirect("/signup");
}
