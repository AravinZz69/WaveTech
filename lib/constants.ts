export const WORK_CATEGORIES = [
  "Software Engineering",
  "Data & AI",
  "IT & Security",
  "Product",
  "Project Management",
  "Design",
  "Operations",
  "Marketing",
  "Sales",
] as const;

export const COMMON_ROLES = [
  "AI Engineer",
  "Full Stack Engineer",
  "Data Scientist",
  "Backend Engineer",
  "Frontend Engineer",
  "Mobile Engineer",
  "DevOps Engineer",
  "QA Engineer",
  "ML Engineer",
  "Product Designer",
  "UI/UX Designer",
  "Product Manager",
] as const;

export const COMMON_SKILLS = [
  "Python",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "React",
  "Node.js",
  "LLM Integration",
  "Agentic AI",
  "Agentic Workflows",
  "AI Agents",
  "Machine Learning",
  "Full-Stack Development",
  "REST APIs",
  "Microservices",
  "PostgreSQL",
  "PyTorch",
  "TensorFlow",
  "Docker",
  "Figma",
] as const;

export const CAREER_STAGES = ["Student", "Graduate", "Working"] as const;

export const WORKPLACE_OPTIONS = ["Remote", "Hybrid", "On-site"] as const;

export const INDIA_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Kolkata",
  "Noida",
  "Gurugram",
] as const;

export const JOB_TYPES = ["Full-time", "Internship", "Part-time", "Freelance"] as const;

export const SEARCH_STATUSES = [
  "Actively looking",
  "Open to offers",
  "Not looking",
] as const;

export const NOTICE_PERIODS = [
  "Immediately",
  "15 days",
  "1 month",
  "2 months",
  "3 months",
  "3+ months",
] as const;

export const COMPANY_SIZES = ["Startup", "Small", "Mid-size", "Large"] as const;

export const FUNDING_STAGES = [
  "Early stage",
  "Growth",
  "Late stage",
  "Other funded",
] as const;

export const BUSINESS_MODELS = [
  "Product",
  "Services",
  "Global capability centre",
  "Staffing",
  "Marketplace",
  "Hybrid",
] as const;

export const CUSTOMER_TYPES = ["B2B", "B2C", "Both"] as const;

export const TRACKER_COLUMNS = [
  { id: "saved", label: "Saved", emptyText: "Save jobs from Picks or Chat to track them here" },
  { id: "ready_to_apply", label: "Ready to apply", emptyText: "Jobs with a tailored resume wait here" },
  { id: "applied", label: "Applied", emptyText: "Jobs you applied to wait here" },
  { id: "interview", label: "Interview", emptyText: "Drag a card here when you get an interview" },
  { id: "offer", label: "Offer", emptyText: "Drag a card here when an offer comes in" },
  { id: "closed", label: "Closed", emptyText: "Archived or rejected applications" },
] as const;

export type SearchStatus = (typeof SEARCH_STATUSES)[number];
export type TrackerStatus = (typeof TRACKER_COLUMNS)[number]["id"];
