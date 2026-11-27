"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Mail, Search, Sparkles } from "lucide-react";

const SLIDES = [
  {
    id: "chat",
    render: () => (
      <div className="w-full max-w-[360px] space-y-5 animate-float-slow">
        <p className="text-center text-[15px] font-medium tracking-[-0.01em] text-zinc-700">
          What are we looking for today?
        </p>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
          <p className="text-[13px] text-zinc-500 mb-4">
            paid AI engineering roles, remote
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
              <Search className="h-3 w-3 text-zinc-500" /> Find jobs
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
              <FileText className="h-3 w-3 text-zinc-500" /> Tailor my resume
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
              <Sparkles className="h-3 w-3 text-zinc-500" /> Check my fit
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "skills",
    render: () => (
      <div className="w-full max-w-[360px] space-y-5 text-center animate-float-slow">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-xs">
          <FileText className="h-3.5 w-3.5" />
          From your resume
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["AI Engineer", "Full Stack", "Python", "Next.js", "LLM Agents", "REST APIs"].map(
            (tag, idx) => (
              <span
                key={tag}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                  idx % 2 === 0
                    ? "elip-btn-dark"
                    : "border border-black/[0.07] bg-white text-zinc-800 shadow-xs"
                }`}
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>
    ),
  },
  {
    id: "picks",
    render: () => (
      <div className="w-full max-w-[360px] space-y-4 animate-float-slow">
        <p className="text-center text-[15px] font-medium tracking-[-0.01em] text-zinc-700">
          Wave Tech picks three.
        </p>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.06)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Alchemyst AI · Bengaluru</span>
            <span className="rounded-full elip-btn-dark px-2.5 py-0.5 text-[10px] font-medium">
              Strong fit
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-900">Full Stack AI Engineer Intern</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Streaming AI interfaces draw on your React, Next.js, and WebSocket skills.
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md elip-btn-dark px-2 py-0.5 text-[11px]">
              <Check className="h-3 w-3" /> Next.js
            </span>
            <span className="inline-flex items-center gap-1 rounded-md elip-btn-dark px-2 py-0.5 text-[11px]">
              <Check className="h-3 w-3" /> AI Agents
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "inbox",
    render: () => (
      <div className="w-full max-w-[360px] space-y-4 animate-float-slow">
        <p className="text-center text-[15px] font-medium tracking-[-0.01em] text-zinc-700">
          In your workspace, synced every 4 hours.
        </p>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.05)] space-y-2">
          {[
            { title: "Your picks for today", sub: "Alchemyst AI, iion, Microsoft" },
            { title: "Tracker check-in", sub: "2 applications waiting for confirmation" },
            { title: "Tailored resume ready", sub: "Full Stack AI Engineer Intern" },
          ].map((row) => (
            <div
              key={row.title}
              className="flex items-start gap-2.5 rounded-xl bg-[#f6f6f8] p-2.5"
            >
              <Mail className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-900">{row.title}</p>
                <p className="text-[11px] text-zinc-500">{row.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function OnboardingShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const current = SLIDES[index];

  return (
    <div className="w-full max-w-[540px] aspect-square rounded-[28px] bg-gradient-to-b from-[#f4f4f6] to-[#ededf0] border border-black/[0.05] p-8 flex flex-col items-center justify-between relative overflow-hidden">
      <div className="w-full flex items-center justify-end gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-zinc-900" : "w-1.5 bg-zinc-300"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 w-full flex items-center justify-center">
        {current.render()}
      </div>

      <div className="text-[11px] text-zinc-400">Wave Tech Career Agent</div>
    </div>
  );
}
