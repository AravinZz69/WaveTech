export default function ChatLoadingSkeleton() {
  return (
    <div className="h-dvh w-full bg-[#f2f2f4] p-2.5 flex gap-2.5 overflow-hidden">
      <div className="hidden md:flex w-52 flex-col justify-between py-2 px-2">
        <div className="space-y-4">
          <div className="h-7 w-28 rounded-lg bg-zinc-200/80 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-full rounded-xl bg-zinc-200/70 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-12 w-full rounded-2xl bg-white/80 animate-pulse" />
      </div>

      <div className="flex-1 elip-surface rounded-[20px] p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-zinc-100 animate-pulse" />
        </div>

        <div className="max-w-lg w-full mx-auto space-y-4">
          <div className="h-7 w-32 mx-auto rounded-lg bg-zinc-100 animate-pulse" />
          <div className="h-5 w-52 mx-auto rounded-lg bg-zinc-100 animate-pulse" />
          <div className="h-28 w-full rounded-[18px] bg-zinc-100 animate-pulse" />
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
