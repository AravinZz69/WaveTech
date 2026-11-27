import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The requested Wave Tech page could not be found.",
};

export default function NotFoundPage() {
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
          href="/login"
          className="rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="elip-surface rounded-[24px] p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Error 404
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-zinc-900">
            Page not found
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Return to your
            Wave Tech workspace to continue your job search.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              href="/chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl elip-btn-dark px-5 py-2.5 text-xs font-medium"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Open Workspace</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go Home</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
