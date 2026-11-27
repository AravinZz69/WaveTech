"use client";

import { useState } from "react";
import { Check, History, Loader2, X } from "lucide-react";
import {
  BUSINESS_MODELS,
  CAREER_STAGES,
  COMMON_ROLES,
  COMMON_SKILLS,
  COMPANY_SIZES,
  CUSTOMER_TYPES,
  FUNDING_STAGES,
  INDIA_CITIES,
  JOB_TYPES,
  NOTICE_PERIODS,
  SEARCH_STATUSES,
  WORKPLACE_OPTIONS,
  WORK_CATEGORIES,
} from "@/lib/constants";
import type { CandidateProfileItem, SearchHistoryItem } from "./types";

export function YourSearchPane({
  profile,
  searchHistory,
  onSaveProfile,
  onRunHistoryQuery,
  onClose,
}: {
  profile: CandidateProfileItem;
  searchHistory: SearchHistoryItem[];
  onSaveProfile: (patch: Partial<CandidateProfileItem>) => Promise<void>;
  onRunHistoryQuery: (query: string) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  async function patch(next: Partial<CandidateProfileItem>) {
    setSaving(true);
    try {
      await onSaveProfile(next);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayField(
    key: keyof CandidateProfileItem,
    current: string[],
    value: string
  ) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    void patch({ [key]: next } as Partial<CandidateProfileItem>);
  }

  return (
    <div className="h-full flex flex-col bg-white min-w-0">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">
            Your search
          </h2>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
          aria-label="Close search settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        <div>
          <select
            value={profile.searchStatus}
            onChange={(e) => void patch({ searchStatus: e.target.value })}
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none"
          >
            {SEARCH_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {profile.memorySummary && (
          <div className="rounded-2xl border border-zinc-200/80 bg-[#f7f7f8] p-3.5 space-y-1">
            <p className="text-[11px] font-medium text-zinc-400">
              Wave Tech profile memory
            </p>
            <p className="text-xs text-zinc-700 leading-relaxed">{profile.memorySummary}</p>
          </div>
        )}

        <section className="space-y-4">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            The work
          </h3>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {WORK_CATEGORIES.map((cat) => {
                const active = profile.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleArrayField("categories", profile.categories, cat)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...profile.roles, ...COMMON_ROLES])).map((role) => {
                const active = profile.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleArrayField("roles", profile.roles, role)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...profile.skills, ...COMMON_SKILLS])).map((skill) => {
                const active = profile.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleArrayField("skills", profile.skills, skill)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Job type</p>
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map((jt) => {
                const active = profile.jobTypes.includes(jt);
                return (
                  <button
                    key={jt}
                    type="button"
                    onClick={() => toggleArrayField("jobTypes", profile.jobTypes, jt)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {jt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Can join</p>
            <div className="flex flex-wrap gap-1.5">
              {NOTICE_PERIODS.map((np) => (
                <button
                  key={np}
                  type="button"
                  onClick={() => void patch({ noticePeriod: np })}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${
                    profile.noticePeriod === np
                      ? "elip-btn-dark"
                      : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {np}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-zinc-100 pt-5">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Where
          </h3>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Workplace</p>
            <div className="flex flex-wrap gap-1.5">
              {WORKPLACE_OPTIONS.map((wp) => {
                const active = profile.workplace.includes(wp);
                return (
                  <button
                    key={wp}
                    type="button"
                    onClick={() => toggleArrayField("workplace", profile.workplace, wp)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {wp}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Cities</p>
            <div className="flex flex-wrap gap-1.5">
              {INDIA_CITIES.map((city) => {
                const active = profile.cities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleArrayField("cities", profile.cities, city)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      active
                        ? "elip-btn-dark"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-zinc-100 pt-5">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Stage
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CAREER_STAGES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => void patch({ stage: st })}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  profile.stage === st
                    ? "elip-btn-dark"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Years of experience</span>
              <span className="font-medium text-zinc-900">
                {profile.experienceYears === 0
                  ? "0 yrs · Fresher"
                  : `${profile.experienceYears} yrs`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={profile.experienceYears}
              onChange={(e) =>
                void patch({ experienceYears: Number(e.target.value) })
              }
              className="w-full accent-zinc-900"
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-zinc-100 pt-5">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Companies
          </h3>

          {[
            { label: "Size", key: "companySizes" as const, options: COMPANY_SIZES },
            { label: "Funding", key: "fundingStages" as const, options: FUNDING_STAGES },
            { label: "Business model", key: "businessModels" as const, options: BUSINESS_MODELS },
            { label: "Customers", key: "customerTypes" as const, options: CUSTOMER_TYPES },
          ].map((group) => {
            const current = profile[group.key];
            return (
              <div key={group.key} className="space-y-1.5">
                <p className="text-xs text-zinc-500">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((opt) => {
                    const active = current.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleArrayField(group.key, current, opt)}
                        className={`rounded-lg px-2.5 py-1 text-xs transition ${
                          active
                            ? "elip-btn-dark"
                            : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-3 border-t border-zinc-100 pt-5">
          <div className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Search history
            </h3>
          </div>
          {searchHistory.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Your job searches in chat will appear here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {searchHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRunHistoryQuery(item.query)}
                  className="w-full text-left rounded-xl border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50 flex items-center justify-between gap-2"
                >
                  <span className="truncate text-zinc-800">{item.query}</span>
                  <span className="text-[11px] text-zinc-400 shrink-0">
                    {item.resultCount} jobs
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
