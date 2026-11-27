import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Wave Tech support for candidate accounts, job sync, and feedback.",
};

export default function ContactPage() {
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
        <div className="elip-surface rounded-[24px] p-6 sm:p-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-zinc-900">
              Contact Wave Tech
            </h1>
            <p className="text-sm text-zinc-500">
              Questions about your candidate profile, resume parsing, or job sync? Reach us directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="mailto:support@wavetech.ai"
              className="rounded-2xl border border-zinc-200 p-5 hover:border-zinc-400 transition space-y-2"
            >
              <Mail className="h-5 w-5 text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-900">Email Support</p>
              <p className="text-xs text-zinc-600">support@wavetech.ai</p>
            </a>

            <a
              href="tel:+918045681200"
              className="rounded-2xl border border-zinc-200 p-5 hover:border-zinc-400 transition space-y-2"
            >
              <Phone className="h-5 w-5 text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-900">Phone</p>
              <p className="text-xs text-zinc-600">+91 80 4568 1200</p>
            </a>
          </div>

          <div className="rounded-2xl bg-[#f7f7f8] border border-zinc-200/70 p-4 flex items-start gap-3 text-xs text-zinc-600">
            <MapPin className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-zinc-900">Wave Tech HQ</p>
              <p className="mt-0.5">Bengaluru, Karnataka, India</p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
