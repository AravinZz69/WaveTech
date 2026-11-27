import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { ChatCardMetadata } from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { reviewResumeWithAI, runCandidateChatAgent, streamChatReplyWithAI } from "@/lib/ai";
import { ensureFreshJobsCatalog } from "@/lib/job-sync";
import { scoreJobForCandidate } from "@/lib/matching";

const chatPostSchema = z.object({
  message: z.string().min(1).max(4000),
  focusedJobId: z.string().optional(),
  stream: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const limit = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get("limit") || "50")));

    const [messages, history] = await Promise.all([
      db
        .select({
          id: schema.chatMessages.id,
          role: schema.chatMessages.role,
          content: schema.chatMessages.content,
          metadata: schema.chatMessages.metadata,
          createdAt: schema.chatMessages.createdAt,
        })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, session.user.id))
        .orderBy(asc(schema.chatMessages.createdAt))
        .limit(limit),
      db
        .select({
          id: schema.searchHistory.id,
          query: schema.searchHistory.query,
          resultCount: schema.searchHistory.resultCount,
          createdAt: schema.searchHistory.createdAt,
        })
        .from(schema.searchHistory)
        .where(eq(schema.searchHistory.userId, session.user.id))
        .orderBy(desc(schema.searchHistory.createdAt))
        .limit(20),
    ]);

    return NextResponse.json({ messages, searchHistory: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat.";
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
    const { message, focusedJobId, stream } = chatPostSchema.parse(body);
    const db = getDb();

    await ensureFreshJobsCatalog();

    // Run independent DB queries in parallel selecting only required columns
    const [[profile], userResumes, allJobs, priorMessages] = await Promise.all([
      db
        .select({
          roles: schema.candidateProfiles.roles,
          skills: schema.candidateProfiles.skills,
          workplace: schema.candidateProfiles.workplace,
          cities: schema.candidateProfiles.cities,
          jobTypes: schema.candidateProfiles.jobTypes,
          experienceYears: schema.candidateProfiles.experienceYears,
          stage: schema.candidateProfiles.stage,
          searchStatus: schema.candidateProfiles.searchStatus,
          memorySummary: schema.candidateProfiles.memorySummary,
        })
        .from(schema.candidateProfiles)
        .where(eq(schema.candidateProfiles.userId, session.user.id))
        .limit(1),
      db
        .select({
          id: schema.resumes.id,
          title: schema.resumes.title,
          kind: schema.resumes.kind,
          rawText: schema.resumes.rawText,
        })
        .from(schema.resumes)
        .where(eq(schema.resumes.userId, session.user.id))
        .orderBy(desc(schema.resumes.createdAt)),
      db
        .select({
          id: schema.jobs.id,
          title: schema.jobs.title,
          companyName: schema.jobs.companyName,
          location: schema.jobs.location,
          workplace: schema.jobs.workplace,
          jobType: schema.jobs.jobType,
          skills: schema.jobs.skills,
          minExperience: schema.jobs.minExperience,
          maxExperience: schema.jobs.maxExperience,
          description: schema.jobs.description,
          aiTake: schema.jobs.aiTake,
        })
        .from(schema.jobs)
        .where(eq(schema.jobs.isActive, true))
        .orderBy(desc(schema.jobs.postedAt))
        .limit(40),
      db
        .select({
          role: schema.chatMessages.role,
          content: schema.chatMessages.content,
        })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, session.user.id))
        .orderBy(desc(schema.chatMessages.createdAt))
        .limit(10),
    ]);

    const matchProfile = {
      roles: profile?.roles ?? [],
      skills: profile?.skills ?? [],
      workplace: profile?.workplace ?? [],
      cities: profile?.cities ?? [],
      jobTypes: profile?.jobTypes ?? [],
      experienceYears: profile?.experienceYears ?? 0,
    };

    const scoredJobs = allJobs
      .map((j) => ({
        ...j,
        match: scoreJobForCandidate(j, matchProfile),
      }))
      .sort((a, b) => b.match.score - a.match.score);

    const focusedJob = focusedJobId
      ? scoredJobs.find((j) => j.id === focusedJobId) || null
      : null;

    const [userMsg] = await db
      .insert(schema.chatMessages)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        role: "user",
        content: message,
      })
      .returning();

    const profileSummary = profile
      ? `Roles: ${profile.roles.join(", ")}. Skills: ${profile.skills.join(", ")}. Stage: ${profile.stage} (${profile.experienceYears} yrs). Workplace: ${profile.workplace.join(", ")}. Status: ${profile.searchStatus}. ${profile.memorySummary || ""}`
      : "No profile configured yet.";

    const historyChronological = [...priorMessages]
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const agent = await runCandidateChatAgent({
      userMessage: message,
      history: historyChronological,
      candidateName: session.user.name,
      profileSummary,
      resumes: userResumes.map((r) => ({ id: r.id, title: r.title, kind: r.kind })),
      availableJobs: scoredJobs.slice(0, 15).map((j) => ({
        id: j.id,
        title: j.title,
        companyName: j.companyName,
        location: j.location,
        workplace: j.workplace,
        fitLabel: j.match.fitLabel,
        aiTake: j.aiTake,
      })),
      focusedJob,
    });

    // When streaming is requested for conversational Q&A (action === "none"), stream tokens via NDJSON
    if (stream && agent.action === "none") {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = "";
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "user", userMessage: userMsg }) + "\n"
              )
            );
            for await (const token of streamChatReplyWithAI({
              userMessage: message,
              history: historyChronological,
              candidateName: session.user.name,
              profileSummary,
              focusedJob,
            })) {
              fullText += token;
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: "delta", text: token }) + "\n")
              );
            }
            const finalContent = fullText.trim() || agent.reply;
            const metadata: ChatCardMetadata | null = agent.followUpPrompt
              ? { followUpPrompt: agent.followUpPrompt }
              : null;
            const [assistantMsg] = await db
              .insert(schema.chatMessages)
              .values({
                id: crypto.randomUUID(),
                userId: session.user.id,
                role: "assistant",
                content: finalContent,
                metadata,
              })
              .returning();
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "done",
                  assistantMessage: assistantMsg,
                  action: "none",
                }) + "\n"
              )
            );
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Streaming error.";
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "error", error: errMsg }) + "\n")
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    let metadata: ChatCardMetadata | null = null;
    let assistantReply = agent.reply;

    if (agent.action === "show_picks") {
      const topIds = scoredJobs.slice(0, 10).map((j) => j.id);
      metadata = {
        type: "picks",
        jobIds: topIds,
        followUpPrompt: agent.followUpPrompt,
      };
      await db.insert(schema.searchHistory).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        query: message,
        filtersSnapshot: { roles: matchProfile.roles, skills: matchProfile.skills },
        resultCount: topIds.length,
      });
    } else if (agent.action === "show_tailor_card") {
      const targetJob =
        scoredJobs.find((j) => j.id === agent.targetJobId) || focusedJob || scoredJobs[0];
      if (targetJob) {
        metadata = {
          type: "tailor",
          jobId: targetJob.id,
          companyName: targetJob.companyName,
          roleTitle: targetJob.title,
          followUpPrompt:
            agent.followUpPrompt || `Help me prepare for the ${targetJob.companyName} interview`,
        };
      }
    } else if (agent.action === "show_apply_picker") {
      const targetJob =
        scoredJobs.find((j) => j.id === agent.targetJobId) || focusedJob || scoredJobs[0];
      if (targetJob) {
        metadata = {
          type: "apply_picker",
          jobId: targetJob.id,
          companyName: targetJob.companyName,
          roleTitle: targetJob.title,
          followUpPrompt: agent.followUpPrompt,
        };
      }
    } else if (agent.action === "show_review") {
      const defaultResume = userResumes.find((r) => r.kind === "original") || userResumes[0];
      if (defaultResume) {
        const review = await reviewResumeWithAI({
          resumeText: defaultResume.rawText,
          targetRoles: matchProfile.roles,
        });
        assistantReply = `${review.summary}\n\n**Strengths:**\n${review.strengths.map((s) => `• ${s}`).join("\n")}\n\n**Suggested Improvements:**\n${review.improvements.map((i) => `• ${i}`).join("\n")}`;
        metadata = {
          type: "review",
          resumeId: defaultResume.id,
          suggestions: review.improvements,
        };
      }
    } else if (agent.followUpPrompt) {
      metadata = { followUpPrompt: agent.followUpPrompt };
    }

    const [assistantMsg] = await db
      .insert(schema.chatMessages)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        role: "assistant",
        content: assistantReply,
        metadata,
      })
      .returning();

    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      action: agent.action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid chat payload", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to process message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
