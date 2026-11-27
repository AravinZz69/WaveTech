"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  FileText,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  MessageSquare,
  PanelLeft,
  Paperclip,
  Phone,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { formatSearchSummary } from "@/lib/matching";
import { PicksListPane, JobDetailPane } from "./PicksPane";
import type {
  ApplicationItem,
  CandidateProfileItem,
  ChatMessageItem,
  JobItem,
  ResumeItem,
  RightPaneMode,
  SearchHistoryItem,
} from "./types";

function PaneSkeleton() {
  return (
    <div className="h-full p-5 space-y-4">
      <div className="h-6 w-36 rounded-lg bg-zinc-100 animate-pulse" />
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 w-full rounded-2xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const TrackerPane = dynamic(
  () => import("./TrackerPane").then((m) => m.TrackerPane),
  { loading: () => <PaneSkeleton /> }
);
const ResumesPane = dynamic(
  () => import("./ResumesPane").then((m) => m.ResumesPane),
  { loading: () => <PaneSkeleton /> }
);
const YourSearchPane = dynamic(
  () => import("./YourSearchPane").then((m) => m.YourSearchPane),
  { loading: () => <PaneSkeleton /> }
);

export function CandidateWorkspace({
  user,
  initialProfile,
  initialResumes,
  initialJobs,
  initialApplications,
  initialMessages,
  initialSearchHistory,
  initialNeedsDailyCheckIn,
}: {
  user: { id: string; name: string; email: string };
  initialProfile: CandidateProfileItem;
  initialResumes: ResumeItem[];
  initialJobs: JobItem[];
  initialApplications: ApplicationItem[];
  initialMessages: ChatMessageItem[];
  initialSearchHistory: SearchHistoryItem[];
  initialNeedsDailyCheckIn: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rightPane, setRightPane] = useState<RightPaneMode>(
    initialNeedsDailyCheckIn ? { type: "tracker" } : null
  );

  const [profile, setProfile] = useState<CandidateProfileItem>(initialProfile);
  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [applications, setApplications] = useState<ApplicationItem[]>(initialApplications);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(initialSearchHistory);
  const [needsDailyCheckIn, setNeedsDailyCheckIn] = useState(initialNeedsDailyCheckIn);

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [carouselOffset, setCarouselOffset] = useState<Record<string, number>>({});
  const [selectedResumeForApply, setSelectedResumeForApply] = useState<Record<string, string>>({});

  const [tailorModalJob, setTailorModalJob] = useState<JobItem | null>(null);
  const [tailorIntensity, setTailorIntensity] = useState<"light" | "balanced" | "deep">("balanced");
  const [tailoring, setTailoring] = useState(false);

  const firstName = user.name.split(" ")[0] || "there";
  const savedJobIds = useMemo(
    () => new Set(applications.map((a) => a.jobId)),
    [applications]
  );
  const needsYouCount = useMemo(
    () => applications.filter((a) => a.needsStatusConfirm).length,
    [applications]
  );
  const focusedJob = useMemo(
    () =>
      rightPane?.type === "job"
        ? jobs.find((j) => j.id === rightPane.jobId) ?? null
        : null,
    [rightPane, jobs]
  );
  const currentYear = new Date().getFullYear();

  const jobsInFlightRef = useRef<Promise<void> | null>(null);
  const appsInFlightRef = useRef<Promise<void> | null>(null);

  function showSuccess(msg: string) {
    setErrorBanner(null);
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner((curr) => (curr === msg ? null : curr));
    }, 3500);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function refreshApplications() {
    if (appsInFlightRef.current) return appsInFlightRef.current;
    appsInFlightRef.current = (async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        }
      } finally {
        appsInFlightRef.current = null;
      }
    })();
    return appsInFlightRef.current;
  }

  async function refreshJobs() {
    if (jobsInFlightRef.current) return jobsInFlightRef.current;
    jobsInFlightRef.current = (async () => {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } finally {
        jobsInFlightRef.current = null;
      }
    })();
    return jobsInFlightRef.current;
  }

  async function handleSyncJobs() {
    if (syncing) return;
    setSyncing(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/jobs/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Job sync failed.");
      } else {
        await refreshJobs();
        showSuccess(`Synced ${data.upserted ?? 0} live jobs across job boards.`);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Job sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSendChat(overrideMessage?: string) {
    const text = (overrideMessage ?? inputText).trim();
    if (!text || sending) return;

    if (!overrideMessage) setInputText("");
    setActionsMenuOpen(false);
    setErrorBanner(null);

    const tempUserId = `temp-${crypto.randomUUID()}`;
    const tempAssistantId = `stream-${crypto.randomUUID()}`;
    const optimisticUser: ChatMessageItem = {
      id: tempUserId,
      role: "user",
      content: text,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          focusedJobId: focusedJob?.id,
          stream: true,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const evt = JSON.parse(line) as {
              type: string;
              text?: string;
              userMessage?: ChatMessageItem;
              assistantMessage?: ChatMessageItem;
              error?: string;
            };

            if (evt.type === "user" && evt.userMessage) {
              const confirmedUser = evt.userMessage;
              setMessages((prev) =>
                prev.map((m) => (m.id === tempUserId ? confirmedUser : m))
              );
            } else if (evt.type === "delta" && evt.text) {
              const chunk = evt.text;
              setMessages((prev) =>
                prev.some((m) => m.id === tempAssistantId)
                  ? prev.map((m) =>
                      m.id === tempAssistantId
                        ? { ...m, content: m.content + chunk }
                        : m
                    )
                  : [
                      ...prev,
                      {
                        id: tempAssistantId,
                        role: "assistant",
                        content: chunk,
                        metadata: null,
                        createdAt: new Date().toISOString(),
                      },
                    ]
              );
            } else if (evt.type === "done" && evt.assistantMessage) {
              const finalMsg = evt.assistantMessage;
              setMessages((prev) =>
                prev.some((m) => m.id === tempAssistantId)
                  ? prev.map((m) => (m.id === tempAssistantId ? finalMsg : m))
                  : [...prev, finalMsg]
              );
            } else if (evt.type === "error") {
              setErrorBanner(evt.error || "Streaming error.");
            }
          }
        }
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to get response.");
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
        return;
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserId),
        data.userMessage,
        data.assistantMessage,
      ]);

      if (data.action === "show_picks") {
        setRightPane({ type: "picks" });
        void refreshJobs();
      }

      const histRes = await fetch("/api/chat");
      if (histRes.ok) {
        const histData = await histRes.json();
        setSearchHistory(histData.searchHistory || []);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Network error.");
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserId && m.id !== tempAssistantId)
      );
    } finally {
      setSending(false);
    }
  }

  async function handleUploadResume(file: File, announceInChat = true) {
    setUploadingResume(true);
    setErrorBanner(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resumes/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Resume upload failed.");
        return;
      }

      setResumes((prev) => [data.resume, ...prev]);
      if (data.profile) setProfile(data.profile);
      showSuccess(`Uploaded ${data.resume.fileName} and updated profile skills.`);

      if (announceInChat) {
        const notes =
          Array.isArray(data.suggestions) && data.suggestions.length > 0
            ? `\n\nSuggested improvements:\n${data.suggestions
                .slice(0, 3)
                .map((s: string) => `• ${s}`)
                .join("\n")}`
            : "";
        setMessages((prev) => [
          ...prev,
          {
            id: `upload-${crypto.randomUUID()}`,
            role: "assistant",
            content: `Uploaded **${data.resume.fileName}** and updated your profile skills (${(
              data.profile?.skills || []
            )
              .slice(0, 6)
              .join(", ")}).${notes}`,
            metadata: { followUpPrompt: "find the best jobs for me" },
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleToggleSaveJob(jobId: string) {
    setErrorBanner(null);
    const snapshot = applications;
    const existing = applications.find((a) => a.jobId === jobId);
    try {
      if (existing && existing.status === "saved") {
        setApplications((prev) => prev.filter((a) => a.id !== existing.id));
        const res = await fetch(`/api/applications/${existing.id}`, { method: "DELETE" });
        if (!res.ok) {
          setApplications(snapshot);
          const d = await res.json();
          setErrorBanner(d.error || "Could not remove saved job.");
          return;
        }
        showSuccess("Removed from Saved jobs.");
      } else if (!existing) {
        const job = jobs.find((j) => j.id === jobId);
        if (job) {
          setApplications((prev) => [
            {
              id: `opt-${jobId}`,
              jobId,
              resumeId: null,
              status: "saved",
              needsStatusConfirm: false,
              redirectedAt: null,
              appliedAt: null,
              notes: null,
              updatedAt: new Date().toISOString(),
              job,
              resume: null,
            },
            ...prev,
          ]);
        }
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, action: "save" }),
        });
        if (!res.ok) {
          setApplications(snapshot);
          const d = await res.json();
          setErrorBanner(d.error || "Could not save job.");
          return;
        }
        showSuccess("Saved to Tracker.");
      }
      await refreshApplications();
    } catch (err) {
      setApplications(snapshot);
      setErrorBanner(err instanceof Error ? err.message : "Could not update saved job.");
    }
  }

  async function handleApplyJob(job: JobItem, resumeId?: string) {
    setErrorBanner(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          resumeId,
          action: job.directApplySupported ? "direct_apply" : "redirect_apply",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to record application.");
        return;
      }
      await refreshApplications();

      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
        showSuccess(`Opened ${job.companyName} portal & saved to Tracker.`);
        setMessages((prev) => [
          ...prev,
          {
            id: `apply-${crypto.randomUUID()}`,
            role: "assistant",
            content: `Opened **${job.companyName}**'s application portal in a new tab and saved **${job.title}** to your Tracker. Once you're back, confirm whether you submitted it.`,
            metadata: null,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (data.mode === "direct_sent") {
        showSuccess(`Application sent to ${job.companyName}!`);
        setMessages((prev) => [
          ...prev,
          {
            id: `apply-${crypto.randomUUID()}`,
            role: "assistant",
            content: `Application sent directly to **${job.companyName}** for **${job.title}** and moved to Applied in your Tracker.`,
            metadata: null,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Application request failed.");
    }
  }

  async function handleTailorResumeSubmit() {
    if (!tailorModalJob || tailoring) return;
    setTailoring(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/resumes/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: tailorModalJob.id,
          intensity: tailorIntensity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to tailor resume.");
        return;
      }

      setResumes((prev) => [data.resume, ...prev]);
      await refreshApplications();
      showSuccess(`Tailored resume created for ${tailorModalJob.companyName}.`);
      setTailorModalJob(null);
      setRightPane({ type: "resumes" });
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to tailor resume.");
    } finally {
      setTailoring(false);
    }
  }

  async function handleSaveProfile(patch: Partial<CandidateProfileItem>) {
    setErrorBanner(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorBanner(d.error || "Failed to update search preferences.");
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      await refreshJobs();
      showSuccess("Search preferences saved.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Could not save preferences.");
    }
  }

  async function handleUpdateAppStatus(
    appId: string,
    status: string,
    needsConfirm = false
  ) {
    setErrorBanner(null);
    const snapshot = applications;
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status, needsStatusConfirm: needsConfirm } : a
      )
    );
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, needsStatusConfirm: needsConfirm }),
      });
      if (!res.ok) {
        setApplications(snapshot);
        const d = await res.json();
        setErrorBanner(d.error || "Failed to update status.");
        return;
      }
      await refreshApplications();
      showSuccess("Tracker status updated.");
    } catch (err) {
      setApplications(snapshot);
      setErrorBanner(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  async function handleAcknowledgeCheckIn() {
    setNeedsDailyCheckIn(false);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgeDailyCheckIn: true }),
    });
  }

  const summaryLabel = formatSearchSummary(profile);
  const isFullTracker = rightPane?.type === "tracker";
  const hasMessages = messages.length > 0;

  const navItems = [
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      active: rightPane === null,
      onClick: () => {
        setRightPane(null);
        setMobileMenuOpen(false);
      },
    },
    {
      id: "picks",
      label: "Picks",
      icon: Inbox,
      active: rightPane?.type === "picks" || rightPane?.type === "job",
      onClick: () => {
        setRightPane({ type: "picks" });
        setMobileMenuOpen(false);
      },
    },
    {
      id: "tracker",
      label: "Tracker",
      icon: BarChart3,
      active: rightPane?.type === "tracker",
      badge: needsYouCount > 0 ? needsYouCount : undefined,
      onClick: () => {
        setRightPane({ type: "tracker" });
        setMobileMenuOpen(false);
      },
    },
    {
      id: "resumes",
      label: "Resumes",
      icon: FileText,
      active: rightPane?.type === "resumes",
      badge: resumes.length > 0 ? resumes.length : undefined,
      onClick: () => {
        setRightPane({ type: "resumes" });
        setMobileMenuOpen(false);
      },
    },
    {
      id: "search",
      label: "Your search",
      icon: SlidersHorizontal,
      active: rightPane?.type === "search",
      onClick: () => {
        setRightPane({ type: "search" });
        setMobileMenuOpen(false);
      },
    },
  ];

  function renderComposer(isEmptyCenter = false) {
    return (
      <div
        className={`w-full ${
          isEmptyCenter ? "max-w-[540px]" : "max-w-[660px]"
        } mx-auto rounded-[18px] border border-zinc-200/90 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] relative`}
      >
        {actionsMenuOpen && (
          <div className="absolute bottom-14 right-3 w-56 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg z-20 space-y-0.5 text-xs">
            {[
              { label: "Find my best roles", prompt: "find the best jobs for me" },
              {
                label: "Review & improve my resume",
                prompt: "review my resume and suggest improvements",
              },
              {
                label: focusedJob
                  ? `Tailor resume for ${focusedJob.companyName}`
                  : "Tailor my resume",
                prompt: focusedJob
                  ? `Tailor my resume for ${focusedJob.companyName}`
                  : "tailor my resume",
              },
              {
                label: focusedJob
                  ? `Apply me to ${focusedJob.title}`
                  : "Apply to a role",
                prompt: focusedJob
                  ? `Apply me to ${focusedJob.title} at ${focusedJob.companyName}`
                  : "apply me to a matching role",
              },
            ].map((act) => (
              <button
                key={act.label}
                type="button"
                onClick={() => void handleSendChat(act.prompt)}
                className="w-full text-left rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                {act.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendChat();
              }
            }}
            placeholder={focusedJob ? "Ask about this job" : "Message Wave Tech"}
            className="flex-1 min-w-0 text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none px-1 py-1"
          />
          <button
            type="button"
            disabled={sending || !inputText.trim()}
            onClick={() => void handleSendChat()}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition shrink-0 disabled:bg-zinc-200 disabled:text-zinc-400 enabled:elip-btn-dark"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        {isEmptyCenter && (
          <div className="flex flex-wrap gap-1.5 pt-3">
            {[
              { label: "Find jobs", prompt: "find the best jobs for me", icon: Search },
              { label: "Tailor my resume", prompt: "tailor my resume", icon: FileText },
              {
                label: "Review resume",
                prompt: "review my resume and suggest improvements",
                icon: Sparkles,
              },
            ].map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void handleSendChat(chip.prompt)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                >
                  <Icon className="h-3 w-3 text-zinc-500" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 text-xs text-zinc-500">
          <button
            type="button"
            onClick={() => setRightPane({ type: "search" })}
            className="inline-flex items-center gap-1.5 hover:text-zinc-900 truncate"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Your search</span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActionsMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Actions</span>
            </button>
            <button
              type="button"
              disabled={uploadingResume}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploadingResume ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              <span>Attach</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-full max-w-full overflow-hidden flex bg-[#f2f2f4] text-zinc-900 p-2 sm:p-2.5 gap-2 sm:gap-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUploadResume(f, true);
          e.target.value = "";
        }}
      />

      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden md:flex h-full flex-col justify-between transition-all duration-200 shrink-0 ${
          sidebarOpen ? "w-52 px-1" : "w-12"
        }`}
      >
        <div className="pt-1.5 space-y-5">
          <div className="flex items-center justify-between px-2 h-8">
            {sidebarOpen ? (
              <Link
                href="/"
                onClick={() => setRightPane(null)}
                className="text-[20px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80"
              >
                wave tech<span className="text-zinc-400">.</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="mx-auto text-[15px] font-bold tracking-[-0.03em] text-zinc-900"
                title="Expand sidebar"
              >
                w.
              </button>
            )}
            {sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-[#e5e5e8]"
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  title={item.label}
                  className={`w-full flex items-center rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                    item.active
                      ? "bg-[#e5e5e8] text-zinc-900"
                      : "text-zinc-600 hover:bg-[#e9e9ec] hover:text-zinc-900"
                  } ${!sidebarOpen ? "justify-center" : "justify-between"}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </span>
                  {sidebarOpen && item.badge !== undefined && (
                    <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-zinc-600 border border-black/[0.06]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Floating User Card */}
        <div className="pb-0.5 space-y-2">
          {sidebarOpen && (
            <div className="px-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-zinc-400">
              <Link href="/contact" className="hover:text-zinc-700">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-zinc-700">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-zinc-700">
                Terms
              </Link>
              <span>© {currentYear}</span>
            </div>
          )}

          <div
            className={`relative rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-2.5 flex items-center ${
              !sidebarOpen ? "justify-center" : "justify-between gap-2"
            }`}
          >
            {profile.searchStatus === "Actively looking" && (
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-600 ring-2 ring-[#f2f2f4]"
                title={profile.searchStatus}
              />
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[#a8431b] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{user.name}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                title="Sign out"
                aria-label="Sign out"
                className="text-zinc-400 hover:text-zinc-900 p-1 rounded-lg hover:bg-zinc-100"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/35"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full bg-[#f2f2f4] p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => {
                    setRightPane(null);
                    setMobileMenuOpen(false);
                  }}
                  className="text-[20px] font-bold tracking-[-0.03em] text-zinc-900"
                >
                  wave tech<span className="text-zinc-400">.</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-600"
                  aria-label="Close mobile menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${
                        item.active
                          ? "bg-[#e5e5e8] text-zinc-900"
                          : "text-zinc-600 hover:bg-white/60"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700 border border-black/[0.06]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-white border border-black/[0.06] p-3 space-y-2 text-xs text-zinc-500">
                <div className="flex flex-wrap gap-3">
                  <Link href="/contact" className="hover:text-zinc-900">
                    Contact
                  </Link>
                  <Link href="/privacy" className="hover:text-zinc-900">
                    Privacy
                  </Link>
                  <Link href="/terms" className="hover:text-zinc-900">
                    Terms
                  </Link>
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href="mailto:support@wavetech.ai"
                    className="inline-flex items-center gap-1.5 hover:text-zinc-900"
                  >
                    <Mail className="h-3.5 w-3.5" /> support@wavetech.ai
                  </a>
                  <a
                    href="tel:+918045681200"
                    className="inline-flex items-center gap-1.5 hover:text-zinc-900"
                  >
                    <Phone className="h-3.5 w-3.5" /> +91 80 4568 1200
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400">
                  © {currentYear} Wave Tech. All rights reserved.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/[0.06] p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-[#a8431b] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {firstName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{profile.searchStatus}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="text-zinc-500 hover:text-zinc-900 p-1.5"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split-Pane Surfaces */}
      <div className="flex-1 h-full min-w-0 flex gap-2.5">
        {!isFullTracker && (
          <section
            className={`h-full elip-surface rounded-[20px] flex-col min-w-0 overflow-hidden ${
              rightPane ? "hidden lg:flex lg:w-[49%]" : "flex w-full"
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden h-8 w-8 rounded-xl border border-zinc-200/80 bg-white flex items-center justify-center text-zinc-700 shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>

                {!sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="hidden md:flex h-8 w-8 rounded-xl border border-zinc-200/80 bg-white items-center justify-center text-zinc-600 hover:text-zinc-900 shrink-0"
                    aria-label="Expand sidebar"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setRightPane({ type: "search" })}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-0 max-w-[210px] sm:max-w-[340px]"
                >
                  <Briefcase className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{summaryLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>
              </div>

              {!rightPane && (
                <button
                  type="button"
                  onClick={() => setRightPane({ type: "tracker" })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-zinc-800 hover:border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Tracker</span>
                  {needsYouCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
              )}
            </div>

            {errorBanner && (
              <div
                role="alert"
                className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 flex items-center justify-between gap-2"
              >
                <span className="truncate">{errorBanner}</span>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="font-medium underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {successBanner && (
              <div
                role="status"
                className="mx-4 mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 flex items-center justify-between gap-2"
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{successBanner}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="font-medium underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-10">
                <div className="text-center mb-6">
                  <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-900">
                    Hi {firstName}
                  </h1>
                  <p className="text-[16px] sm:text-[17px] text-zinc-500 mt-1">
                    {resumes.length === 0
                      ? "Upload your resume to get started."
                      : "What should I look for today?"}
                  </p>
                </div>

                {resumes.length === 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4 inline-flex items-center gap-2 rounded-xl elip-btn-dark px-4 py-2.5 text-xs font-medium"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Upload resume (PDF, Word, image)</span>
                  </button>
                )}

                {renderComposer(true)}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
                  <div className="max-w-[660px] mx-auto space-y-5 pb-4">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";
                      const meta = msg.metadata;
                      const picksJobs =
                        meta?.type === "picks" && meta.jobIds
                          ? meta.jobIds
                              .map((id) => jobs.find((j) => j.id === id))
                              .filter((j): j is JobItem => Boolean(j))
                          : [];
                      const offset = carouselOffset[msg.id] || 0;
                      const tailorJob =
                        meta?.type === "tailor" && meta.jobId
                          ? jobs.find((j) => j.id === meta.jobId)
                          : undefined;
                      const applyJob =
                        meta?.type === "apply_picker" && meta.jobId
                          ? jobs.find((j) => j.id === meta.jobId)
                          : undefined;

                      return (
                        <div key={msg.id} className="space-y-3">
                          <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[88%] rounded-2xl text-[13.5px] leading-[1.6] whitespace-pre-line break-words ${
                                isUser
                                  ? "bg-[#f3f3f5] text-zinc-900 px-4 py-2.5"
                                  : "text-zinc-800 px-1 py-1"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>

                          {picksJobs.length > 0 && (
                            <div className="rounded-2xl border border-zinc-200/80 bg-[#fafafa] p-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[12.5px] font-semibold text-zinc-900">
                                  Your picks
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={offset <= 0}
                                    onClick={() =>
                                      setCarouselOffset((prev) => ({
                                        ...prev,
                                        [msg.id]: Math.max(0, offset - 1),
                                      }))
                                    }
                                    className="h-6 w-6 rounded-md border border-zinc-200 bg-white flex items-center justify-center disabled:opacity-30"
                                    aria-label="Previous picks"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={offset + 2 >= picksJobs.length}
                                    onClick={() =>
                                      setCarouselOffset((prev) => ({
                                        ...prev,
                                        [msg.id]: offset + 1,
                                      }))
                                    }
                                    className="h-6 w-6 rounded-md border border-zinc-200 bg-white flex items-center justify-center disabled:opacity-30"
                                    aria-label="Next picks"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRightPane({ type: "picks" })}
                                    className="h-6 w-6 rounded-md border border-zinc-200 bg-white flex items-center justify-center"
                                    title="Open full picks list"
                                    aria-label="Expand picks list"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {picksJobs.slice(offset, offset + 2).map((job) => {
                                  const isSaved = savedJobIds.has(job.id);
                                  return (
                                    <div
                                      key={job.id}
                                      onClick={() =>
                                        setRightPane({ type: "job", jobId: job.id })
                                      }
                                      className="cursor-pointer rounded-xl border border-zinc-200/80 bg-white p-3.5 space-y-1.5 hover:border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition min-w-0"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-zinc-900 truncate">
                                            {job.companyName}
                                          </p>
                                          <p className="text-[11px] text-zinc-400 truncate">
                                            {job.location} ({job.workplace})
                                          </p>
                                        </div>
                                        <div
                                          className="flex items-center gap-0.5 shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => void handleToggleSaveJob(job.id)}
                                            className={`h-6 w-6 rounded-md flex items-center justify-center ${
                                              isSaved ? "text-zinc-900" : "text-zinc-400"
                                            }`}
                                            aria-label="Save job"
                                          >
                                            <Bookmark className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setRightPane({ type: "job", jobId: job.id })
                                            }
                                            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-900"
                                            aria-label="Open job detail"
                                          >
                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-[13px] font-semibold text-zinc-900 line-clamp-1">
                                        {job.title}
                                      </p>
                                      <p className="text-[11.5px] text-zinc-500 line-clamp-2">
                                        {job.aiTake}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {tailorJob && (
                            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-[#f7f7f8] flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-zinc-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] text-zinc-400">Tailoring</p>
                                  <p className="text-[13.5px] font-semibold text-zinc-900 truncate">
                                    Tailor: {tailorJob.title}
                                  </p>
                                  <p className="text-xs text-zinc-500 truncate">
                                    {tailorJob.companyName} · Ready to tailor from your resume
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTailorModalJob(tailorJob)}
                                className="rounded-xl elip-btn-dark px-4 py-2 text-xs font-medium shrink-0"
                              >
                                Open
                              </button>
                            </div>
                          )}

                          {applyJob && (
                            <div className="rounded-2xl border border-zinc-200/90 bg-[#fafafa] p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-zinc-900 truncate">
                                    {applyJob.title} — {applyJob.companyName}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">
                                    Choose which resume to use for this application
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRightPane({ type: "job", jobId: applyJob.id })
                                  }
                                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline shrink-0"
                                >
                                  View job
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                {resumes.map((r) => {
                                  const selectedId =
                                    selectedResumeForApply[msg.id] || resumes[0]?.id;
                                  const active = selectedId === r.id;
                                  return (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() =>
                                        setSelectedResumeForApply((prev) => ({
                                          ...prev,
                                          [msg.id]: r.id,
                                        }))
                                      }
                                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs flex items-center justify-between transition ${
                                        active
                                          ? "elip-btn-dark border-transparent"
                                          : "border-zinc-200 bg-white text-zinc-800"
                                      }`}
                                    >
                                      <span className="truncate">
                                        [{r.kind}] {r.title}
                                      </span>
                                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleApplyJob(
                                      applyJob,
                                      selectedResumeForApply[msg.id] || resumes[0]?.id
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl elip-btn-dark px-4 py-2 text-xs font-medium"
                                >
                                  <span>Send application</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTailorModalJob(applyJob)}
                                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Tailor first
                                </button>
                              </div>
                            </div>
                          )}

                          {meta?.followUpPrompt && (
                            <button
                              type="button"
                              onClick={() => void handleSendChat(meta.followUpPrompt)}
                              className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-900 pl-1 text-left"
                            >
                              <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                              <span>{meta.followUpPrompt}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {sending && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 pl-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="px-3 sm:px-5 pb-3 sm:pb-4 pt-1 shrink-0">
                  {renderComposer(false)}
                </div>
              </>
            )}
          </section>
        )}

        {rightPane && (
          <section
            className={`h-full elip-surface rounded-[20px] overflow-hidden min-w-0 flex flex-col ${
              isFullTracker ? "w-full" : "w-full lg:w-[51%]"
            }`}
          >
            <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-[#fafafa] shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700"
              >
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPane(null)}
                className="text-xs font-medium text-zinc-700 underline"
              >
                Back to Chat
              </button>
            </div>

            {(errorBanner || successBanner) && isFullTracker && (
              <div className="px-4 pt-3 space-y-2 shrink-0">
                {errorBanner && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 flex items-center justify-between"
                  >
                    <span>{errorBanner}</span>
                    <button
                      type="button"
                      onClick={() => setErrorBanner(null)}
                      className="font-medium underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {successBanner && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 flex items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{successBanner}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSuccessBanner(null)}
                      className="font-medium underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0">
              {rightPane.type === "picks" && (
                <PicksListPane
                  jobs={jobs}
                  savedJobIds={savedJobIds}
                  summaryLabel={summaryLabel}
                  syncing={syncing}
                  onSync={() => void handleSyncJobs()}
                  onSelectJob={(jobId) => setRightPane({ type: "job", jobId })}
                  onToggleSave={(jobId) => void handleToggleSaveJob(jobId)}
                  onClose={() => setRightPane(null)}
                />
              )}

              {rightPane.type === "job" &&
                (() => {
                  const idx = jobs.findIndex((j) => j.id === rightPane.jobId);
                  const job = idx >= 0 ? jobs[idx] : null;
                  if (!job) return null;
                  return (
                    <JobDetailPane
                      job={job}
                      index={idx}
                      total={jobs.length}
                      isSaved={savedJobIds.has(job.id)}
                      onBack={() => setRightPane({ type: "picks" })}
                      onPrev={() => {
                        if (idx > 0) setRightPane({ type: "job", jobId: jobs[idx - 1].id });
                      }}
                      onNext={() => {
                        if (idx < jobs.length - 1) {
                          setRightPane({ type: "job", jobId: jobs[idx + 1].id });
                        }
                      }}
                      onClose={() => setRightPane(null)}
                      onToggleSave={(jobId) => void handleToggleSaveJob(jobId)}
                      onApply={(j) => void handleApplyJob(j)}
                      onTailor={(j) => setTailorModalJob(j)}
                    />
                  );
                })()}

              {rightPane.type === "tracker" && (
                <TrackerPane
                  applications={applications}
                  jobs={jobs}
                  needsDailyCheckIn={needsDailyCheckIn}
                  onUpdateStatus={handleUpdateAppStatus}
                  onAcknowledgeCheckIn={handleAcknowledgeCheckIn}
                  onAddManual={async (jobId, status) => {
                    const res = await fetch("/api/applications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        jobId,
                        action: status === "applied" ? "mark_applied" : "save",
                      }),
                    });
                    if (!res.ok) {
                      const d = await res.json();
                      setErrorBanner(d.error || "Could not add application.");
                      return;
                    }
                    await refreshApplications();
                    showSuccess("Added to Tracker.");
                  }}
                  onOpenJob={(jobId) => setRightPane({ type: "job", jobId })}
                  onClose={() => setRightPane(null)}
                />
              )}

              {rightPane.type === "resumes" && (
                <ResumesPane
                  resumes={resumes}
                  onUploadResume={(file) => handleUploadResume(file, false)}
                  onClose={() => setRightPane(null)}
                />
              )}

              {rightPane.type === "search" && (
                <YourSearchPane
                  profile={profile}
                  searchHistory={searchHistory}
                  onSaveProfile={handleSaveProfile}
                  onRunHistoryQuery={(q) => {
                    setRightPane(null);
                    void handleSendChat(q);
                  }}
                  onClose={() => setRightPane(null)}
                />
              )}
            </div>
          </section>
        )}
      </div>

      {tailorModalJob && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 space-y-5 shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Tailor resume</p>
              <h3 className="text-lg font-semibold text-zinc-900">
                {tailorModalJob.title} at {tailorModalJob.companyName}
              </h3>
              <p className="text-xs text-zinc-500">
                Choose how much to change for this role.
              </p>
            </div>

            <div className="space-y-2">
              {(
                [
                  {
                    id: "light",
                    title: "Light",
                    desc: "Reorder skills and subtly align keywords without changing bullets.",
                  },
                  {
                    id: "balanced",
                    title: "Balanced",
                    desc: "Refine summary and top experience bullets to highlight matched skills.",
                  },
                  {
                    id: "deep",
                    title: "Deep",
                    desc: "Rewrite framing heavily for this job while staying 100% truthful.",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTailorIntensity(opt.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    tailorIntensity === opt.id
                      ? "elip-btn-dark border-transparent"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.title}</p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      tailorIntensity === opt.id ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTailorModalJob(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={tailoring}
                onClick={() => void handleTailorResumeSubmit()}
                className="inline-flex items-center gap-1.5 rounded-xl elip-btn-dark px-4 py-2 text-xs font-medium disabled:opacity-50"
              >
                {tailoring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Tailoring...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate tailored resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
