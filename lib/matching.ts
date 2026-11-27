export interface CandidateMatchProfile {
  roles: string[];
  skills: string[];
  workplace: string[];
  cities: string[];
  jobTypes: string[];
  experienceYears: number;
  expectedPayAmount?: number | null;
  expectedPayCurrency?: string | null;
}

export interface JobMatchCandidate {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workplace: string;
  jobType: string;
  skills: string[];
  minExperience: number;
  maxExperience: number | null;
  description: string;
}

export interface JobMatchResult {
  score: number;
  fitLabel: "Strong fit" | "Good fit" | "Fair fit";
  matchedSkills: string[];
  missingSkills: string[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function scoreJobForCandidate(
  job: JobMatchCandidate,
  profile: CandidateMatchProfile
): JobMatchResult {
  const candidateSkills = new Set(profile.skills.map(normalize));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of job.skills) {
    const norm = normalize(skill);
    const isMatched =
      candidateSkills.has(norm) ||
      Array.from(candidateSkills).some((cs) => cs.includes(norm) || norm.includes(cs));
    if (isMatched) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  let score = 35;

  if (job.skills.length > 0) {
    const skillRatio = matchedSkills.length / job.skills.length;
    score += Math.round(skillRatio * 35);
  } else {
    score += 15;
  }

  const jobTitleNorm = normalize(job.title);
  const roleMatch = profile.roles.some((role) => {
    const r = normalize(role);
    return jobTitleNorm.includes(r) || r.split(/\s+/).some((w) => w.length > 2 && jobTitleNorm.includes(w));
  });
  if (roleMatch) score += 15;

  const workplaceMatch =
    profile.workplace.length === 0 ||
    profile.workplace.some((w) => normalize(w) === normalize(job.workplace));
  if (workplaceMatch) score += 8;

  const jobTypeMatch =
    profile.jobTypes.length === 0 ||
    profile.jobTypes.some((jt) => normalize(jt) === normalize(job.jobType));
  if (jobTypeMatch) score += 7;

  const expOk =
    profile.experienceYears >= job.minExperience &&
    (job.maxExperience == null || profile.experienceYears <= job.maxExperience + 1);
  if (!expOk) score -= 12;

  const bounded = Math.max(0, Math.min(100, score));
  const fitLabel: JobMatchResult["fitLabel"] =
    bounded >= 75 ? "Strong fit" : bounded >= 55 ? "Good fit" : "Fair fit";

  return {
    score: bounded,
    fitLabel,
    matchedSkills,
    missingSkills,
  };
}

export function formatSearchSummary(profile: {
  roles: string[];
  workplace: string[];
  cities: string[];
}): string {
  const primaryRole = profile.roles[0] || "All roles";
  const extraRoles = profile.roles.length > 1 ? ` +${profile.roles.length - 1}` : "";
  const wp =
    profile.workplace.length > 0
      ? profile.workplace.map((w) => w.toLowerCase()).join(" / ")
      : "any workplace";
  const places =
    profile.cities.length > 0
      ? `${profile.cities.length} ${profile.cities.length === 1 ? "place" : "places"}`
      : "any location";

  return `${primaryRole}${extraRoles} · ${wp}, ${places}`;
}
