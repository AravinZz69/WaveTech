import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Better Auth Core Tables
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Candidate Profile & Search Preferences
// ---------------------------------------------------------------------------
export const candidateProfiles = pgTable("candidate_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  categories: jsonb("categories").$type<string[]>().notNull().default([]),
  roles: jsonb("roles").$type<string[]>().notNull().default([]),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  stage: text("stage").notNull().default("Graduate"),
  experienceYears: integer("experience_years").notNull().default(0),
  locations: jsonb("locations").$type<string[]>().notNull().default(["India"]),
  cities: jsonb("cities").$type<string[]>().notNull().default([]),
  workplace: jsonb("workplace").$type<string[]>().notNull().default(["Remote", "Hybrid"]),
  jobTypes: jsonb("job_types").$type<string[]>().notNull().default(["Full-time"]),
  searchStatus: text("search_status").notNull().default("Actively looking"),
  noticePeriod: text("notice_period").notNull().default("Immediately"),
  currentPayAmount: integer("current_pay_amount"),
  currentPayCurrency: text("current_pay_currency").notNull().default("INR"),
  currentPayPeriod: text("current_pay_period").notNull().default("Yearly"),
  expectedPayAmount: integer("expected_pay_amount"),
  expectedPayCurrency: text("expected_pay_currency").notNull().default("INR"),
  expectedPayPeriod: text("expected_pay_period").notNull().default("Yearly"),
  companySizes: jsonb("company_sizes").$type<string[]>().notNull().default([]),
  fundingStages: jsonb("funding_stages").$type<string[]>().notNull().default([]),
  businessModels: jsonb("business_models").$type<string[]>().notNull().default([]),
  customerTypes: jsonb("customer_types").$type<string[]>().notNull().default([]),
  memorySummary: text("memory_summary"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  lastStatusCheckAt: timestamp("last_status_check_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Jobs Catalog (synced every 4 hours + direct company roles later)
// ---------------------------------------------------------------------------
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull(),
    source: text("source").notNull(),
    companyName: text("company_name").notNull(),
    companyLogoUrl: text("company_logo_url"),
    companyDomain: text("company_domain"),
    companySize: text("company_size"),
    companyFunding: text("company_funding"),
    businessModel: text("business_model"),
    customerType: text("customer_type"),
    title: text("title").notNull(),
    location: text("location").notNull(),
    workplace: text("workplace").notNull().default("Remote"),
    jobType: text("job_type").notNull().default("Full-time"),
    minExperience: integer("min_experience").notNull().default(0),
    maxExperience: integer("max_experience"),
    payDisplay: text("pay_display").notNull().default("Not listed"),
    description: text("description").notNull(),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    applyUrl: text("apply_url").notNull(),
    directApplySupported: boolean("direct_apply_supported").notNull().default(false),
    aiTake: text("ai_take").notNull().default(""),
    activeHiringCount: integer("active_hiring_count").notNull().default(1),
    postedAt: timestamp("posted_at").notNull().defaultNow(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("jobs_external_id_idx").on(table.externalId),
    index("jobs_active_posted_idx").on(table.isActive, table.postedAt),
    index("jobs_source_idx").on(table.source),
  ]
);

// ---------------------------------------------------------------------------
// Resumes (Original + Tailored)
// ---------------------------------------------------------------------------
export interface ParsedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  categories: string[];
  roles: string[];
  experienceYears: number;
  stage?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    tech: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  improvementSuggestions?: string[];
}

export const resumes = pgTable(
  "resumes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("original"), // 'original' | 'tailored'
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),
    pdfBase64: text("pdf_base64"),
    rawText: text("raw_text").notNull(),
    parsedJson: jsonb("parsed_json").$type<ParsedResumeData>(),
    tailoredForJobId: text("tailored_for_job_id").references(() => jobs.id, {
      onDelete: "set null",
    }),
    tailorIntensity: text("tailor_intensity"), // 'light' | 'balanced' | 'deep'
    tailorNotes: text("tailor_notes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("resumes_user_idx").on(table.userId),
    index("resumes_user_kind_idx").on(table.userId, table.kind),
  ]
);

// ---------------------------------------------------------------------------
// Applications Tracker
// ---------------------------------------------------------------------------
export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resumes.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("saved"),
    needsStatusConfirm: boolean("needs_status_confirm").notNull().default(false),
    redirectedAt: timestamp("redirected_at"),
    appliedAt: timestamp("applied_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("applications_user_job_idx").on(table.userId, table.jobId),
    index("applications_user_status_idx").on(table.userId, table.status),
    index("applications_user_confirm_idx").on(table.userId, table.needsStatusConfirm),
  ]
);

// ---------------------------------------------------------------------------
// Chat Messages & Search History & Job Sync Logs
// ---------------------------------------------------------------------------
export interface ChatCardMetadata {
  type?: "picks" | "tailor" | "review" | "apply_picker";
  jobIds?: string[];
  jobId?: string;
  resumeId?: string;
  tailoredResumeId?: string;
  companyName?: string;
  roleTitle?: string;
  suggestions?: string[];
  followUpPrompt?: string;
}

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<ChatCardMetadata>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("chat_messages_user_created_idx").on(table.userId, table.createdAt)]
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    filtersSnapshot: jsonb("filters_snapshot").$type<Record<string, unknown>>(),
    resultCount: integer("result_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("search_history_user_created_idx").on(table.userId, table.createdAt)]
);

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    jobsFetched: integer("jobs_fetched").notNull().default(0),
    jobsUpserted: integer("jobs_upserted").notNull().default(0),
    status: text("status").notNull(), // 'success' | 'error'
    errorMessage: text("error_message"),
    ranAt: timestamp("ran_at").notNull().defaultNow(),
  },
  (table) => [index("sync_logs_ran_at_idx").on(table.ranAt)]
);
