import Link from "next/link";
import { Mail, Phone } from "lucide-react";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`w-full border-t border-zinc-200/80 bg-white text-zinc-500 ${
        compact ? "px-4 py-4 text-[11px]" : "px-6 py-8 text-xs"
      }`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/"
            className="font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80 text-sm"
          >
            wave tech<span className="text-zinc-400">.</span>
          </Link>
          <span>© {year} Wave Tech. All rights reserved.</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/chat" className="hover:text-zinc-900 transition">
            Workspace
          </Link>
          <Link href="/signup" className="hover:text-zinc-900 transition">
            Setup
          </Link>
          <Link href="/contact" className="hover:text-zinc-900 transition">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900 transition">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-900 transition">
            Terms
          </Link>
          <a
            href="mailto:support@wavetech.ai"
            className="inline-flex items-center gap-1 hover:text-zinc-900 transition"
          >
            <Mail className="h-3 w-3" />
            <span>support@wavetech.ai</span>
          </a>
          <a
            href="tel:+918045681200"
            className="inline-flex items-center gap-1 hover:text-zinc-900 transition"
          >
            <Phone className="h-3 w-3" />
            <span>+91 80 4568 1200</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
