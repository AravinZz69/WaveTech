"use client";

import { useRef, useState } from "react";
import { Check, Copy, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import type { ResumeItem } from "./types";

export function ResumesPane({
  resumes,
  onUploadResume,
  onClose,
}: {
  resumes: ResumeItem[];
  onUploadResume: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"original" | "tailored">("original");
  const [openResume, setOpenResume] = useState<ResumeItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const originals = resumes.filter((r) => r.kind === "original");
  const tailored = resumes.filter((r) => r.kind === "tailored");

  const visibleList = tab === "original" ? originals : tailored;

  async function handleCopyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="h-full flex flex-col bg-white min-w-0">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">
          Resumes
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
          aria-label="Close resumes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 sm:px-5 pt-4 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-[#f3f3f5] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("original")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              tab === "original" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
            }`}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => setTab("tailored")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              tab === "tailored" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
            }`}
          >
            Tailored
          </button>
        </div>

        {tab === "original" && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  await onUploadResume(file);
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{uploading ? "Reading..." : "Upload"}</span>
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        <p className="text-xs font-medium text-zinc-400">
          {tab === "original" ? "Your resume" : "Tailored resumes"}
        </p>

        {visibleList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
            {tab === "tailored" ? (
              <p className="text-xs text-zinc-500 leading-relaxed">
                Nothing tailored yet. Hit <span className="font-semibold text-zinc-800">Tailor</span>{" "}
                on a saved job or ask in chat and the version written for that role shows up here.
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                No resume uploaded yet. Upload a PDF, Word, or image file to get started.
              </p>
            )}
          </div>
        ) : (
          visibleList.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 flex items-center justify-between gap-3 min-w-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-[#f4f4f6] flex items-center justify-center shrink-0">
                  {r.kind === "tailored" ? (
                    <Sparkles className="h-4 w-4 text-zinc-700" />
                  ) : (
                    <FileText className="h-4 w-4 text-zinc-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-zinc-900 truncate">{r.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {r.kind === "tailored" && r.tailorIntensity
                      ? `${r.tailorIntensity} tailor · `
                      : "Uploaded "}
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {r.tailorNotes && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.tailorNotes}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenResume(r)}
                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 shrink-0"
              >
                Open
              </button>
            </div>
          ))
        )}
      </div>

      {openResume && (
        <div className="border-t border-zinc-200 bg-[#fafafa] p-4 sm:p-5 max-h-[52%] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">{openResume.title}</p>
              <p className="text-[11px] text-zinc-500 truncate">{openResume.fileName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopyText(openResume.rawText)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied!" : "Copy text"}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenResume(null)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3.5 text-xs text-zinc-800 whitespace-pre-wrap break-words font-sans leading-relaxed">
            {openResume.rawText}
          </pre>
        </div>
      )}
    </div>
  );
}
