import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing the use of the Wave Tech career agent and job matching tools.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f2f2f4]">
      <header className="px-6 py-5 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-[20px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80"
        >
          wave tech<span className="text-zinc-400">.</span>
        </Link>
        <Link
          href="/chat"
          className="rounded-xl elip-btn-dark px-4 py-2 text-xs font-medium"
        >
          Open Workspace
        </Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <article className="elip-surface rounded-[24px] p-6 sm:p-10 space-y-5 text-sm text-zinc-600 leading-relaxed">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-zinc-900">
            Terms of Service
          </h1>
          <p>
            Wave Tech provides AI-assisted resume analysis, job discovery, tailoring drafts, and
            application tracking. Always review tailored resumes and external job details before
            submitting an application.
          </p>
          <p>
            External job links direct to third-party employer or job-board portals governed by
            their respective terms.
          </p>
          <p>
            Questions? Call{" "}
            <a href="tel:+918045681200" className="text-zinc-900 underline">
              +91 80 4568 1200
            </a>{" "}
            or email{" "}
            <a href="mailto:support@wavetech.ai" className="text-zinc-900 underline">
              support@wavetech.ai
            </a>
            .
          </p>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
