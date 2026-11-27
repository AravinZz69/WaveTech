"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { OnboardingShowcase } from "@/components/onboarding/OnboardingShowcase";
import { SiteFooter } from "@/components/SiteFooter";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (res.error) {
          setError(res.error.message || "Could not create account.");
          setLoading(false);
          return;
        }
        setSuccess("Account created! Redirecting to setup...");
        router.push("/signup");
      } else {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password.");
          setLoading(false);
          return;
        }
        setSuccess("Signed in! Opening your workspace...");
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Showcase */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-white">
          <Link
            href="/"
            className="text-[22px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80 w-fit"
          >
            wave tech<span className="text-zinc-400">.</span>
          </Link>
          <div className="flex-1 flex items-center justify-center py-8">
            <OnboardingShowcase />
          </div>
          <div className="text-xs text-zinc-400">
            AI career agent · Curated picks · In-chat resume tailoring
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="flex flex-col justify-center items-center px-5 py-10 sm:px-8 lg:px-16">
          <div className="w-full max-w-[400px] space-y-6">
            <Link
              href="/"
              className="lg:hidden inline-block text-[22px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80"
            >
              wave tech<span className="text-zinc-400">.</span>
            </Link>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-[30px] font-semibold tracking-[-0.025em] text-zinc-900">
                {mode === "signup" ? "Two minutes of setup." : "Welcome back"}
              </h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                {mode === "signup"
                  ? "Upload your resume once. Wave Tech reads it, builds your search, and tailors every application."
                  : "Sign in to open your chat, job picks, and application tracker."}
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-[#f3f3f5] p-1 text-[13px] font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccess(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "signup"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Get started
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccess(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "signin"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="text-xs font-medium text-zinc-700">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-xs font-medium text-zinc-700">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="text-xs font-medium text-zinc-700">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl elip-btn-dark px-4 py-3 text-sm font-medium disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "signup" ? "Continue" : "Sign in"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <SiteFooter compact />
    </div>
  );
}
