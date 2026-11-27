"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Columns3,
  ExternalLink,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { TRACKER_COLUMNS } from "@/lib/constants";
import { useDebouncedValue } from "@/lib/hooks";
import type { ApplicationItem, JobItem } from "./types";
import { CompanyAvatar } from "./PicksPane";

export function TrackerPane({
  applications,
  jobs,
  needsDailyCheckIn,
  onUpdateStatus,
  onAcknowledgeCheckIn,
  onAddManual,
  onOpenJob,
  onClose,
}: {
  applications: ApplicationItem[];
  jobs: JobItem[];
  needsDailyCheckIn: boolean;
  onUpdateStatus: (appId: string, status: string, needsConfirm?: boolean) => Promise<void>;
  onAcknowledgeCheckIn: () => Promise<void>;
  onAddManual: (jobId: string, status: string) => Promise<void>;
  onOpenJob: (jobId: string) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [closedExpanded, setClosedExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (app) =>
        app.job.companyName.toLowerCase().includes(q) ||
        app.job.title.toLowerCase().includes(q)
    );
  }, [applications, debouncedSearch]);

  const needsYouApps = applications.filter((a) => a.needsStatusConfirm);
  const mainColumns = TRACKER_COLUMNS.filter((c) => c.id !== "closed");
  const closedCol = TRACKER_COLUMNS.find((c) => c.id === "closed")!;
  const closedItems = filtered.filter((a) => a.status === "closed");

  return (
    <div className="h-full flex flex-col bg-white min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-zinc-900">
            Tracker
          </h2>
          <div className="inline-flex rounded-xl bg-[#f3f3f5] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
                view === "board" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" /> Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
                view === "list" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>

          {needsYouApps.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f6] px-3 py-1 text-xs font-medium text-zinc-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Needs you · {needsYouApps.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies"
              className="rounded-xl border border-zinc-200 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
            aria-label="Close tracker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(needsDailyCheckIn || needsYouApps.length > 0) && (
        <div className="mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-950">
            <span className="font-semibold">Daily status check-in:</span> You opened{" "}
            {needsYouApps.length} external{" "}
            {needsYouApps.length === 1 ? "application" : "applications"}. Did you submit them?
          </div>
          <button
            type="button"
            onClick={() => void onAcknowledgeCheckIn()}
            className="rounded-xl border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
          >
            Dismiss for today
          </button>
        </div>
      )}

      {showAddPicker && (
        <div className="mx-6 mt-4 rounded-2xl border border-zinc-200 bg-[#fafafa] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-900">Add a role to Applied</p>
            <button
              type="button"
              onClick={() => setShowAddPicker(false)}
              className="text-xs text-zinc-500 hover:text-zinc-900"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {jobs.slice(0, 10).map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={async () => {
                  await onAddManual(job.id, "applied");
                  setShowAddPicker(false);
                }}
                className="text-left rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:border-zinc-900 transition"
              >
                <p className="text-xs font-medium text-zinc-900 truncate">{job.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{job.companyName}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "board" ? (
        <div className="flex-1 w-full min-w-0 overflow-x-auto p-4 sm:p-6">
          <div className="flex gap-3.5 h-full min-w-max">
            {mainColumns.map((col) => {
              const colItems = filtered.filter((a) => a.status === col.id);
              return (
                <div
                  key={col.id}
                  className="w-60 shrink-0 rounded-2xl bg-[#f7f7f8] border border-zinc-200/60 p-3 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[12.5px] font-semibold text-zinc-900">{col.label}</span>
                    <span className="text-xs text-zinc-400">{colItems.length}</span>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {colItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200/90 p-4 text-center text-[11px] text-zinc-400">
                        {col.emptyText}
                      </div>
                    ) : (
                      colItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-200/90 bg-white p-3 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="flex items-start gap-2.5 min-w-0 cursor-pointer"
                              onClick={() => onOpenJob(item.jobId)}
                            >
                              <CompanyAvatar
                                name={item.job.companyName}
                                logoUrl={item.job.companyLogoUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-900 truncate">
                                  {item.job.companyName}
                                </p>
                                <p className="text-[11px] text-zinc-500 line-clamp-2">
                                  {item.job.title}
                                </p>
                              </div>
                            </div>
                            <Bookmark className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                          </div>

                          {item.needsStatusConfirm && (
                            <div className="border-t border-zinc-100 pt-2 space-y-1.5">
                              <p className="text-[11px] text-zinc-400">Did you send it?</p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onUpdateStatus(item.id, "applied", false)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg elip-btn-dark px-2.5 py-1 text-[11px] font-medium"
                                >
                                  <Check className="h-3 w-3" /> Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onUpdateStatus(item.id, "closed", false)
                                  }
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
                                >
                                  No / Skip
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                void onUpdateStatus(item.id, e.target.value, false)
                              }
                              className="rounded-lg border border-zinc-200 bg-[#f7f7f8] px-2 py-1 text-[11px] text-zinc-700 focus:outline-none"
                            >
                              {TRACKER_COLUMNS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>

                            <a
                              href={item.job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-zinc-900"
                              title="Open application link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}

                    {col.id === "applied" && (
                      <button
                        type="button"
                        onClick={() => setShowAddPicker(true)}
                        className="w-full rounded-xl border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 inline-flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add application
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {closedExpanded ? (
              <div className="w-60 shrink-0 rounded-2xl bg-[#f7f7f8] border border-zinc-200/60 p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setClosedExpanded(false)}
                    className="text-[12.5px] font-semibold text-zinc-900 hover:underline"
                  >
                    {closedCol.label}
                  </button>
                  <span className="text-xs text-zinc-400">{closedItems.length}</span>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {closedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2"
                    >
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {item.job.companyName}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{item.job.title}</p>
                      <select
                        value={item.status}
                        onChange={(e) =>
                          void onUpdateStatus(item.id, e.target.value, false)
                        }
                        className="rounded-lg border border-zinc-200 bg-[#f7f7f8] px-2 py-1 text-[11px] text-zinc-700"
                      >
                        {TRACKER_COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setClosedExpanded(true)}
                className="w-11 shrink-0 rounded-2xl bg-[#f7f7f8] border border-zinc-200/60 hover:bg-zinc-100 flex flex-col items-center py-4 gap-2 text-zinc-500"
                title="Expand Closed column"
              >
                <span className="text-[11px] font-medium [writing-mode:vertical-rl] rotate-180">
                  Closed ({closedItems.length})
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f7f8] border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Company & Role</th>
                  <th className="px-4 py-3 font-medium">Resume</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/60">
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => onOpenJob(item.jobId)}
                    >
                      <p className="font-medium text-zinc-900">{item.job.title}</p>
                      <p className="text-zinc-500">{item.job.companyName}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {item.resume?.fileName || "Default"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          void onUpdateStatus(item.id, e.target.value, false)
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs"
                      >
                        {TRACKER_COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={item.job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
