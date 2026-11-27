import type { ChatCardMetadata, ParsedResumeData } from "@/db/schema";

export interface JobMatchInfo {
  score: number;
  fitLabel: "Strong fit" | "Good fit" | "Fair fit";
  matchedSkills: string[];
  missingSkills: string[];
}

export interface JobItem {
  id: string;
  externalId: string;
  source: string;
  companyName: string;
  companyLogoUrl: string | null;
  companyDomain: string | null;
  companySize: string | null;
  companyFunding: string | null;
  businessModel: string | null;
  customerType: string | null;
  title: string;
  location: string;
  workplace: string;
  jobType: string;
  minExperience: number;
  maxExperience: number | null;
  payDisplay: string;
  description: string;
  highlights: string[];
  skills: string[];
  applyUrl: string;
  directApplySupported: boolean;
  aiTake: string;
  activeHiringCount: number;
  postedAt: string;
  match: JobMatchInfo;
}

export interface ResumeItem {
  id: string;
  kind: "original" | "tailored" | string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  rawText: string;
  parsedJson: ParsedResumeData | null;
  tailoredForJobId: string | null;
  tailorIntensity: string | null;
  tailorNotes: string | null;
  hasPdf?: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface ApplicationItem {
  id: string;
  jobId: string;
  resumeId: string | null;
  status: "saved" | "ready_to_apply" | "applied" | "interview" | "offer" | "closed" | string;
  needsStatusConfirm: boolean;
  redirectedAt: string | null;
  appliedAt: string | null;
  notes: string | null;
  updatedAt: string;
  job: Omit<JobItem, "match">;
  resume: ResumeItem | null;
}

export interface CandidateProfileItem {
  id: string;
  userId: string;
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
  companySizes: string[];
  fundingStages: string[];
  businessModels: string[];
  customerTypes: string[];
  memorySummary: string | null;
  onboardingCompleted: boolean;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  metadata: ChatCardMetadata | null;
  createdAt: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  resultCount: number;
  createdAt: string;
}

export type RightPaneMode =
  | null
  | { type: "picks" }
  | { type: "job"; jobId: string }
  | { type: "tracker" }
  | { type: "resumes"; tab?: "original" | "tailored"; resumeId?: string }
  | { type: "search" };
