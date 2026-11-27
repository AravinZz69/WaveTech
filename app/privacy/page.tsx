import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Wave Tech handles your resume, profile memory, and application tracking data.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p>
            Wave Tech stores your uploaded resumes, extracted skills, search preferences, chat
            history, and application tracker records securely in your PostgreSQL database.
          </p>
          <p>
            Resume parsing, job recommendations, and resume tailoring send only the text required
            to fulfill your request to the configured AI provider. Your credentials and session
            cookies are encrypted and never shared publicly.
          </p>
          <p>
            For data removal or privacy questions, contact{" "}
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
