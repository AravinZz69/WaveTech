export default function SignupLoadingSkeleton() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex p-10 items-center justify-center">
        <div className="w-full max-w-[540px] aspect-square rounded-[28px] bg-zinc-100 animate-pulse" />
      </div>
      <div className="flex flex-col justify-center px-6 py-10 lg:px-14">
        <div className="w-full max-w-lg mx-auto space-y-5">
          <div className="h-9 w-56 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-zinc-100 animate-pulse" />
          <div className="h-44 w-full rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-zinc-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
