"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import { OnboardingShowcase } from "./OnboardingShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { useDebouncedValue } from "@/lib/hooks";
import {
  CAREER_STAGES,
  COMMON_ROLES,
  COMMON_SKILLS,
  INDIA_CITIES,
  JOB_TYPES,
  NOTICE_PERIODS,
  SEARCH_STATUSES,
  WORKPLACE_OPTIONS,
  WORK_CATEGORIES,
} from "@/lib/constants";

interface InitialProfile {
  categories: string[];
  roles: string[];
  skills: string[];
  githubUrl: string | null;
  portfolioUrl: string | null;
  stage: string;
  experienceYears: number;
  locations: string[];
  cities: string[];
  workplace: string[];
  jobTypes: string[];
  searchStatus: string;
  noticePeriod: string;
  currentPayAmount: number | null;
  currentPayCurrency: string;
  currentPayPeriod: string;
  expectedPayAmount: number | null;
  expectedPayCurrency: string;
  expectedPayPeriod: string;
}

interface InitialResume {
  id: string;
  fileName: string;
  kind: string;
}

function formatPay(amount: number | null, currency: string, period: string): string {
  if (amount == null || amount <= 0) return "Not set yet";
  if (currency === "INR") {
    if (period === "Yearly") {
      const lakhs = Math.round(amount / 100000);
      return `₹${lakhs} L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  if (period === "Yearly") {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString("en-US")}`;
}

export function OnboardingFlow({
  initialProfile,
  initialResumes,
}: {
  initialProfile: InitialProfile;
  initialResumes: InitialResume[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [resumes, setResumes] = useState<InitialResume[]>(initialResumes);
  const [categories, setCategories] = useState<string[]>(initialProfile.categories);
  const [roles, setRoles] = useState<string[]>(initialProfile.roles);
  const [skills, setSkills] = useState<string[]>(initialProfile.skills);
  const [githubUrl, setGithubUrl] = useState(initialProfile.githubUrl || "");
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile.portfolioUrl || "");
  const [stage, setStage] = useState(initialProfile.stage || "Graduate");
  const [experienceYears, setExperienceYears] = useState(initialProfile.experienceYears || 0);
  const [locations, setLocations] = useState<string[]>(
    initialProfile.locations.length ? initialProfile.locations : ["India"]
  );
  const [cities, setCities] = useState<string[]>(
    initialProfile.cities.length
      ? initialProfile.cities
      : ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai"]
  );
  const [workplace, setWorkplace] = useState<string[]>(
    initialProfile.workplace.length ? initialProfile.workplace : ["Remote", "Hybrid"]
  );
  const [jobTypes, setJobTypes] = useState<string[]>(
    initialProfile.jobTypes.length ? initialProfile.jobTypes : ["Full-time", "Internship"]
  );
  const [searchStatus, setSearchStatus] = useState(
    initialProfile.searchStatus || "Actively looking"
  );
  const [noticePeriod, setNoticePeriod] = useState(
    initialProfile.noticePeriod || "Immediately"
  );

  const [currentPayCurrency, setCurrentPayCurrency] = useState<"INR" | "USD">(
    (initialProfile.currentPayCurrency as "INR" | "USD") || "INR"
  );
  const [currentPayPeriod, setCurrentPayPeriod] = useState<"Yearly" | "Monthly">(
    (initialProfile.currentPayPeriod as "Yearly" | "Monthly") || "Yearly"
  );
  const [currentPayAmount, setCurrentPayAmount] = useState<number | null>(
    initialProfile.currentPayAmount
  );

  const [expectedPayCurrency, setExpectedPayCurrency] = useState<"INR" | "USD">(
    (initialProfile.expectedPayCurrency as "INR" | "USD") || "INR"
  );
  const [expectedPayPeriod, setExpectedPayPeriod] = useState<"Yearly" | "Monthly">(
    (initialProfile.expectedPayPeriod as "Yearly" | "Monthly") || "Yearly"
  );
  const [expectedPayAmount, setExpectedPayAmount] = useState<number | null>(
    initialProfile.expectedPayAmount
  );

  const [catQuery, setCatQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  const debouncedCatQuery = useDebouncedValue(catQuery, 180);
  const debouncedRoleQuery = useDebouncedValue(roleQuery, 180);
  const debouncedSkillQuery = useDebouncedValue(skillQuery, 180);
  const debouncedCityQuery = useDebouncedValue(cityQuery, 180);

  function toggleValue(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  }

  async function handleResumeUpload(file: File) {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to parse resume.");
        return;
      }

      setResumes((prev) => [data.resume, ...prev]);
      if (data.profile) {
        if (data.profile.categories?.length) setCategories(data.profile.categories);
        if (data.profile.roles?.length) setRoles(data.profile.roles);
        if (data.profile.skills?.length) setSkills(data.profile.skills);
        if (data.profile.stage) setStage(data.profile.stage);
        if (typeof data.profile.experienceYears === "number") {
          setExperienceYears(data.profile.experienceYears);
        }
        if (data.profile.githubUrl) setGithubUrl(data.profile.githubUrl);
        if (data.profile.portfolioUrl) setPortfolioUrl(data.profile.portfolioUrl);
      }
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
      setSuccess("Resume parsed — your skills and target roles are pre-filled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfileAndProceed(completeOnboarding: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories,
          roles,
          skills,
          githubUrl: githubUrl.trim() || null,
          portfolioUrl: portfolioUrl.trim() || null,
          stage,
          experienceYears,
          locations,
          cities,
          workplace,
          jobTypes,
          searchStatus,
          noticePeriod,
          currentPayAmount,
          currentPayCurrency,
          currentPayPeriod,
          expectedPayAmount,
          expectedPayCurrency,
          expectedPayPeriod,
          onboardingCompleted: completeOnboarding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save profile.");
        setSaving(false);
        return;
      }

      if (completeOnboarding) {
        router.push("/chat");
        router.refresh();
      } else {
        setSaving(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
      setSaving(false);
    }
  }

  const progressPhase = step === 0 ? 1 : step <= 2 ? 2 : 3;

  const currentPayMax =
    currentPayCurrency === "INR"
      ? currentPayPeriod === "Yearly"
        ? 8000000
        : 500000
      : currentPayPeriod === "Yearly"
      ? 250000
      : 20000;

  const expectedPayMax =
    expectedPayCurrency === "INR"
      ? expectedPayPeriod === "Yearly"
        ? 10000000
        : 600000
      : expectedPayPeriod === "Yearly"
      ? 300000
      : 25000;

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Animated Showcase */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-white">
          <Link
            href="/"
            className="text-[22px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80 w-fit"
          >
            wave tech<span className="text-zinc-400">.</span>
          </Link>
          <div className="flex-1 flex items-center justify-center py-6">
            <OnboardingShowcase />
          </div>
          <div className="text-xs text-zinc-400">
            Your resume & search profile stays private in your Neon DB workspace.
          </div>
        </div>

        {/* Right Onboarding Form */}
        <div className="flex flex-col justify-between px-4 py-6 sm:px-6 sm:py-10 lg:px-14">
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="text-[20px] font-bold tracking-[-0.03em] text-zinc-900 hover:opacity-80"
            >
              wave tech<span className="text-zinc-400">.</span>
            </Link>
            <Link
              href="/chat"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              Skip to workspace
            </Link>
          </div>
          <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center space-y-6">
            {/* Header with optional back */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="h-8 w-8 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  {step === 0 && "Add your resume"}
                  {step === 1 && "Your role and skills"}
                  {step === 2 && "Experience & location"}
                  {step === 3 && "Your search"}
                  {step === 4 && "Current pay"}
                  {step === 5 && "Expected pay"}
                </h1>
                {step === 0 && (
                  <p className="text-sm text-zinc-500 mt-1">
                    Wave Tech reads it, builds your profile memory, and sets up your job search.
                  </p>
                )}
              </div>
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

            {/* STEP 0: RESUME UPLOAD */}
            {step === 0 && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleResumeUpload(f);
                    e.target.value = "";
                  }}
                />

                {resumes.length === 0 || uploading ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) void handleResumeUpload(f);
                    }}
                    disabled={uploading}
                    className="w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 hover:bg-zinc-100/70 transition p-10 flex flex-col items-center justify-center gap-3 text-center"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                        <p className="text-sm font-medium text-zinc-800">
                          Reading resume & extracting skills...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="h-11 w-11 rounded-xl border border-zinc-200 bg-white flex items-center justify-center shadow-2xs">
                          <Upload className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            Drop your resume here, or browse
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            PDF, Word, or image · up to 15 MB
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {resumes.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-2xl bg-zinc-900 text-white px-4 py-3.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-zinc-300 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.fileName}</p>
                            <p className="text-[11px] text-zinc-400">Read · Skills extracted</p>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add another resume
                    </button>

                    {suggestions.length > 0 && (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5">
                        <p className="text-xs font-semibold text-zinc-800">
                          Initial resume improvement notes
                        </p>
                        <ul className="space-y-1 text-xs text-zinc-600 list-disc pl-4">
                          {suggestions.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={uploading || resumes.length === 0}
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl py-3 text-sm font-medium transition disabled:bg-zinc-200 disabled:text-zinc-400 enabled:elip-btn-dark"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 1: CATEGORY, ROLES, SKILLS, LINKS */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800">Category</span>
                    <span className="text-zinc-400">From your resume</span>
                  </div>
                  <input
                    type="text"
                    value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                    placeholder="Search categories"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {WORK_CATEGORIES.filter((c) =>
                      c.toLowerCase().includes(debouncedCatQuery.toLowerCase())
                    ).map((cat) => {
                      const selected = categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleValue(categories, setCategories, cat)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          <span>{cat}</span>
                          {selected && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800">Roles</span>
                    <span className="text-zinc-400">From your resume</span>
                  </div>
                  <input
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && roleQuery.trim()) {
                        e.preventDefault();
                        toggleValue(roles, setRoles, roleQuery.trim());
                        setRoleQuery("");
                      }
                    }}
                    placeholder="Search or type a role and press Enter"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...roles, ...COMMON_ROLES]))
                      .filter((r) => r.toLowerCase().includes(debouncedRoleQuery.toLowerCase()))
                      .slice(0, 12)
                      .map((role) => {
                        const selected = roles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleValue(roles, setRoles, role)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                              selected
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            <span>{role}</span>
                            {selected && <X className="h-3 w-3" />}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800">Skills</span>
                    <span className="text-zinc-400">From your resume</span>
                  </div>
                  <input
                    type="text"
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && skillQuery.trim()) {
                        e.preventDefault();
                        toggleValue(skills, setSkills, skillQuery.trim());
                        setSkillQuery("");
                      }
                    }}
                    placeholder="Search or add a skill"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {Array.from(new Set([...skills, ...COMMON_SKILLS]))
                      .filter((s) => s.toLowerCase().includes(debouncedSkillQuery.toLowerCase()))
                      .map((skill) => {
                        const selected = skills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleValue(skills, setSkills, skill)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                              selected
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            <span>{skill}</span>
                            {selected && <X className="h-3 w-3" />}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">GitHub</label>
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="Enter GitHub profile URL"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Portfolio</label>
                    <input
                      type="text"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="Enter portfolio URL"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl elip-btn-dark py-3 text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2: STAGE, EXPERIENCE, LOCATIONS, WORKPLACE */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Stage</span>
                  <div className="flex flex-wrap gap-2">
                    {CAREER_STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                          stage === s
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800">Experience</span>
                    <span className="font-semibold text-zinc-900">
                      {experienceYears === 0
                        ? "0 yrs · Fresher"
                        : experienceYears >= 15
                        ? "15+ yrs · Senior"
                        : `${experienceYears} yrs`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full accent-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Locations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["India", "United States", "Europe", "Global Remote"].map((loc) => {
                      const selected = locations.includes(loc);
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => toggleValue(locations, setLocations, loc)}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Workplace</span>
                  <div className="flex flex-wrap gap-2">
                    {WORKPLACE_OPTIONS.map((wp) => {
                      const selected = workplace.includes(wp);
                      return (
                        <button
                          key={wp}
                          type="button"
                          onClick={() => toggleValue(workplace, setWorkplace, wp)}
                          className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {wp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Job location</span>
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="Search job locations"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {INDIA_CITIES.filter((c) =>
                      c.toLowerCase().includes(debouncedCityQuery.toLowerCase())
                    ).map((city) => {
                      const selected = cities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => toggleValue(cities, setCities, city)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          <span>{city}</span>
                          {selected && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full rounded-xl elip-btn-dark py-3 text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 3: YOUR SEARCH */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Job type</span>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((jt) => {
                      const selected = jobTypes.includes(jt);
                      return (
                        <button
                          key={jt}
                          type="button"
                          onClick={() => toggleValue(jobTypes, setJobTypes, jt)}
                          className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {jt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">Search status</span>
                  <div className="flex flex-wrap gap-2">
                    {SEARCH_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSearchStatus(st)}
                        className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                          searchStatus === st
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-800">When can you start?</span>
                  <div className="flex flex-wrap gap-2">
                    {NOTICE_PERIODS.map((np) => (
                      <button
                        key={np}
                        type="button"
                        onClick={() => setNoticePeriod(np)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          noticePeriod === np
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {np}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full rounded-xl elip-btn-dark py-3 text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 4: CURRENT PAY */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {(["Yearly", "Monthly"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setCurrentPayPeriod(p);
                        setCurrentPayAmount(null);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        currentPayPeriod === p
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {(["INR", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCurrentPayCurrency(c);
                        setCurrentPayAmount(null);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        currentPayCurrency === c
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">What you last earned</p>
                  <div className="text-3xl font-semibold text-zinc-900">
                    {formatPay(currentPayAmount, currentPayCurrency, currentPayPeriod)}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={currentPayMax}
                    step={
                      currentPayCurrency === "INR"
                        ? currentPayPeriod === "Yearly"
                          ? 100000
                          : 5000
                        : 1000
                    }
                    value={currentPayAmount || 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCurrentPayAmount(v === 0 ? null : v);
                    }}
                    className="w-full accent-zinc-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-full rounded-xl elip-btn-dark py-3 text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 5: EXPECTED PAY */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {(["Yearly", "Monthly"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setExpectedPayPeriod(p);
                        setExpectedPayAmount(null);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        expectedPayPeriod === p
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {(["INR", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setExpectedPayCurrency(c);
                        setExpectedPayAmount(null);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        expectedPayCurrency === c
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="text-3xl font-semibold text-zinc-900">
                    {formatPay(expectedPayAmount, expectedPayCurrency, expectedPayPeriod)}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={expectedPayMax}
                    step={
                      expectedPayCurrency === "INR"
                        ? expectedPayPeriod === "Yearly"
                          ? 100000
                          : 5000
                        : 1000
                    }
                    value={expectedPayAmount || 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setExpectedPayAmount(v === 0 ? null : v);
                    }}
                    className="w-full accent-zinc-900"
                  />
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveProfileAndProceed(true)}
                  className="w-full rounded-xl elip-btn-dark py-3 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Start searching</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 3-Step Footer Progress */}
          <div className="w-full max-w-lg mx-auto pt-8 grid grid-cols-3 gap-2 sm:gap-3 text-[10.5px] sm:text-[11px]">
            {[
              { num: 1, label: "Resume" },
              { num: 2, label: "Profile" },
              { num: 3, label: "Your search" },
            ].map((item) => {
              const active = progressPhase >= item.num;
              return (
                <div key={item.num} className="space-y-1.5 min-w-0">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      active ? "bg-zinc-900" : "bg-zinc-200"
                    }`}
                  />
                  <div className="flex items-center gap-1.5 text-zinc-500 min-w-0">
                    <span
                      className={`h-4 w-4 rounded-full text-[10px] font-semibold inline-flex items-center justify-center shrink-0 ${
                        active ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {item.num}
                    </span>
                    <span className={`truncate ${active ? "text-zinc-900 font-medium" : ""}`}>
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SiteFooter compact />
    </div>
  );
}
