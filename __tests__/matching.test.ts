import { describe, expect, it } from "vitest";
import { formatSearchSummary, scoreJobForCandidate } from "@/lib/matching";

describe("scoreJobForCandidate", () => {
  it("scores strong fit higher when skills, role, workplace, and experience match", () => {
    const profile = {
      roles: ["AI Engineer", "Full Stack Engineer"],
      skills: ["Python", "Next.js", "LLM Integration", "REST APIs"],
      workplace: ["Remote", "Hybrid"],
      cities: ["Bengaluru"],
      jobTypes: ["Full-time", "Internship"],
      experienceYears: 1,
    };

    const strongJob = {
      id: "j1",
      title: "Full Stack AI Engineer Intern",
      companyName: "Alchemyst AI",
      location: "Bengaluru",
      workplace: "Remote",
      jobType: "Internship",
      skills: ["Python", "Next.js", "REST APIs"],
      minExperience: 0,
      maxExperience: 2,
      description: "Build AI workflows",
    };

    const weakJob = {
      id: "j2",
      title: "Senior SAP Consultant",
      companyName: "Legacy Corp",
      location: "Mumbai",
      workplace: "On-site",
      jobType: "Full-time",
      skills: ["SAP ABAP", "HANA", "ERP"],
      minExperience: 7,
      maxExperience: 12,
      description: "Enterprise SAP maintenance",
    };

    const strongResult = scoreJobForCandidate(strongJob, profile);
    const weakResult = scoreJobForCandidate(weakJob, profile);

    expect(strongResult.fitLabel).toBe("Strong fit");
    expect(strongResult.matchedSkills).toEqual(["Python", "Next.js", "REST APIs"]);
    expect(strongResult.missingSkills).toEqual([]);
    expect(strongResult.score).toBeGreaterThan(weakResult.score);
    expect(weakResult.fitLabel).toBe("Fair fit");
  });
});

describe("formatSearchSummary", () => {
  it("formats top bar search summary pill accurately", () => {
    const summary = formatSearchSummary({
      roles: ["AI Engineer", "Full Stack Engineer", "Data Scientist", "Backend Engineer"],
      workplace: ["Hybrid", "Remote"],
      cities: ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai"],
    });
    expect(summary).toBe("AI Engineer +3 · hybrid / remote, 6 places");
  });

  it("handles empty profile arrays gracefully", () => {
    const summary = formatSearchSummary({
      roles: [],
      workplace: [],
      cities: [],
    });
    expect(summary).toBe("All roles · any workplace, any location");
  });
});
