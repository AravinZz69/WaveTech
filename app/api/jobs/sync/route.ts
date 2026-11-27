import { NextRequest, NextResponse } from "next/server";
import { syncExternalJobs } from "@/lib/job-sync";
import { getServerSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isCronAuthorized) {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncExternalJobs();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync jobs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron invokes GET requests on schedule
export async function GET(req: NextRequest) {
  return POST(req);
}
