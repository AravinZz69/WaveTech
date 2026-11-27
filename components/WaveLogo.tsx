import Link from "next/link";

export function WaveLogo({
  href = "/",
  compact = false,
  onClick,
}: {
  href?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <span className="inline-flex items-center gap-2.5 group">
      <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 p-[1px] shadow-[0_0_20px_rgba(56,189,248,0.25)] shrink-0">
        <span className="h-full w-full rounded-[11px] bg-[#0B0E17] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-sky-400 group-hover:scale-105 transition-transform"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 13c2.5-5 4.5-5 7 0s4.5 5 7 0 2.5-3 4-3" />
          </svg>
        </span>
      </span>
      {!compact && (
        <span className="text-[17px] font-bold tracking-[-0.025em] text-slate-100">
          Wave <span className="text-sky-400">Tech</span>
        </span>
      )}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} onClick={onClick} className="inline-flex items-center w-fit">
      {inner}
    </Link>
  );
}
