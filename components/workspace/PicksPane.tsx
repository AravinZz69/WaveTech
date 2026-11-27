"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { JobItem } from "./types";

function formatPostedAgo(isoDate: string): string {
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function CompanyAvatar({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const px = size === "sm" ? 32 : 36;

  if (logoUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`${dim} rounded-full border border-zinc-200 object-contain bg-white p-1 shrink-0`}
      />
    );
  }
  const initial = (name || "W").slice(0, 1).toUpperCase();
  return (
    <div
      className={`${dim} rounded-full border border-zinc-200 bg-gradient-to-b from-[#2e2e32] to-[#141416] text-white flex items-center justify-center text-xs font-semibold shrink-0`}
    >
      {initial}
    </div>
  );
}

export function PicksListPane({
  jobs,
  savedJobIds,
  summaryLabel,
  syncing,
  onSync,
  onSelectJob,
  onToggleSave,
  onClose,
}: {
  jobs: JobItem[];
  savedJobIds: Set<string>;
  summaryLabel: string;
  syncing: boolean;
  onSync: () => void;
  onSelectJob: (jobId: string) => void;
  onToggleSave: (jobId: string) => void;
  onClose: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(20);
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const visibleJobs = jobs.slice(0, visibleCount);

  return (
    <div className="h-full flex flex-col bg-white min-w-0">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-zinc-100">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">
            Your picks
          </h2>
          <p className="text-[11.5px] text-zinc-400 mt-0.5 truncate">
            {todayLabel} · {summaryLabel} · {jobs.length} jobs
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            title="Refresh live jobs now"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing" : "Sync"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
            aria-label="Close picks"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {syncing && jobs.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-200/70 bg-white p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-44 rounded bg-zinc-100 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-zinc-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-md bg-zinc-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-800">No jobs synced yet</p>
            <p className="text-xs text-zinc-500">
              Click Sync to fetch fresh roles from live job boards.
            </p>
          </div>
        ) : (
          <>
            {visibleJobs.map((job) => {
              const isSaved = savedJobIds.has(job.id);
              return (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white px-3.5 sm:px-4 py-3 hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition flex items-center justify-between gap-2.5 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyAvatar name={job.companyName} logoUrl={job.companyLogoUrl} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-zinc-900 truncate">
                        {job.title}
                      </p>
                      <p className="text-[12px] text-zinc-500 truncate">
                        {job.companyName} · {job.location} ({job.workplace})
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="hidden sm:inline-block rounded-md bg-[#f4f4f6] px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                      {job.match.fitLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSave(job.id)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${
                        isSaved
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                      }`}
                      aria-label="Save job"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectJob(job.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label="Open job"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {visibleCount < jobs.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 20)}
                className="w-full rounded-xl border border-zinc-200 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Show more ({jobs.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function JobDetailPane({
  job,
  index,
  total,
  isSaved,
  onBack,
  onPrev,
  onNext,
  onClose,
  onToggleSave,
  onApply,
  onTailor,
}: {
  job: JobItem;
  index: number;
  total: number;
  isSaved: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onToggleSave: (jobId: string) => void;
  onApply: (job: JobItem) => void;
  onTailor: (job: JobItem) => void;
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(job.applyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="h-full flex flex-col bg-white min-w-0">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-zinc-100 text-xs text-zinc-500">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 hover:text-zinc-900 font-medium min-w-0"
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">Your picks</span>
          <span className="text-zinc-300 shrink-0">/</span>
          <span className="text-zinc-900 truncate">{job.companyName}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:inline text-[11.5px] text-zinc-400 mr-1">
            {index + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onPrev}
            disabled={index <= 0}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 disabled:opacity-30 hover:bg-zinc-100"
            aria-label="Previous job"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= total - 1}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 disabled:opacity-30 hover:bg-zinc-100"
            aria-label="Next job"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
            title={copiedLink ? "Link copied!" : "Copy job link"}
            aria-label="Copy job link"
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
          </button>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
            title="Open externally"
            aria-label="Open external job posting"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyAvatar name={job.companyName} logoUrl={job.companyLogoUrl} />
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-semibold tracking-[-0.015em] text-zinc-900 truncate">
              {job.title}
            </h2>
            <div className="flex items-center gap-2 text-[12px] text-zinc-500 mt-0.5">
              <span className="truncate">
                {job.companyName}, {job.location}
              </span>
              <span className="rounded-md bg-[#f4f4f6] px-2 py-0.5 text-[10.5px] font-medium text-zinc-700 shrink-0">
                {job.match.fitLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleSave(job.id)}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition ${
              isSaved
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
            aria-label="Bookmark job"
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onApply(job)}
            className="rounded-xl elip-btn-dark px-4 py-2 text-xs font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-[#fafafa] px-4 py-3">
          <div className="text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">Tailor for this role</span> ·
            Highlight matched skills for {job.companyName}
          </div>
          <button
            type="button"
            onClick={() => onTailor(job)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 shrink-0 shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tailor</span>
          </button>
        </div>

        <p className="text-[13.5px] leading-[1.65] text-zinc-700 whitespace-pre-line break-words">
          {job.description.slice(0, 900)}
          {job.description.length > 900 ? "..." : ""}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-zinc-100 py-4 text-xs">
          <div>
            <p className="text-zinc-400">Experience</p>
            <p className="font-medium text-zinc-900 mt-0.5">
              {job.minExperience}–{job.maxExperience ?? job.minExperience + 3} years
            </p>
          </div>
          <div>
            <p className="text-zinc-400">Pay</p>
            <p className="font-medium text-zinc-900 mt-0.5">{job.payDisplay}</p>
          </div>
          <div>
            <p className="text-zinc-400">Work</p>
            <p className="font-medium text-zinc-900 mt-0.5">{job.workplace}</p>
          </div>
          <div>
            <p className="text-zinc-400">Posted</p>
            <p className="font-medium text-zinc-900 mt-0.5">{formatPostedAgo(job.postedAt)}</p>
          </div>
        </div>

        {job.aiTake && (
          <div className="rounded-2xl border border-zinc-200/80 bg-[#f7f7f8] p-4 space-y-1">
            <p className="text-[11px] font-medium text-zinc-400">Wave Tech&apos;s take</p>
            <p className="text-[13.5px] text-zinc-800">{job.aiTake}</p>
          </div>
        )}

        {job.highlights.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-[14px] font-semibold text-zinc-900">What you&apos;d do</h3>
            <ul className="space-y-2 text-[13.5px] text-zinc-700 list-disc pl-5 marker:text-indigo-400">
              {job.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        {job.skills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-zinc-900">Skills they want</h3>
              <span className="text-[11px] text-zinc-400">✓ = on your profile</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => {
                const matched = job.match.matchedSkills.includes(skill);
                return (
                  <span
                    key={skill}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                      matched
                        ? "elip-btn-dark"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700"
                    }`}
                  >
                    {matched && <Check className="h-3 w-3" />}
                    <span>{skill}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <h3 className="text-[14px] font-semibold text-zinc-900">At {job.companyName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-[#fafafa] p-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500">Hiring channel</p>
              <div className="flex items-center gap-2 text-xs text-zinc-700">
                <Users className="h-4 w-4 text-zinc-500" />
                <span>External portal · {job.source}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-[#fafafa] p-4 space-y-1">
              <p className="text-xs font-medium text-zinc-500">Hiring</p>
              <p className="text-2xl font-semibold text-zinc-900">{job.activeHiringCount}</p>
              <p className="text-xs text-zinc-500">open role(s) tracked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
