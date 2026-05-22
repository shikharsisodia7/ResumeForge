export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/master-profile", label: "Master Profile", icon: "User" },
  { href: "/resumes", label: "Resumes", icon: "FileText" },
  { href: "/resume-builder", label: "Resume Builder", icon: "PenLine" },
  { href: "/tailor", label: "Tailor Resume", icon: "Wand2" },
  { href: "/job-descriptions", label: "Job Descriptions", icon: "Briefcase" },
  { href: "/ats-scanner", label: "ATS Scanner", icon: "ScanSearch" },
  { href: "/matcher", label: "Job Matcher", icon: "GitCompare" },
  { href: "/bullets", label: "Bullet Bank", icon: "List" },
  { href: "/bullet-builder", label: "Bullet Builder", icon: "Hammer" },
  { href: "/experiences", label: "Experiences", icon: "Building2" },
  { href: "/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/skills", label: "Skills", icon: "Sparkles" },
  { href: "/applications", label: "Applications", icon: "Send" },
  { href: "/cover-letters", label: "Cover Letters", icon: "Mail" },
  { href: "/interview-prep", label: "Interview Prep", icon: "Mic" },
  { href: "/star-stories", label: "STAR Stories", icon: "Star" },
  { href: "/files", label: "File Vault", icon: "Archive" },
  { href: "/timeline", label: "Timeline", icon: "Clock" },
  { href: "/import", label: "Import Resume", icon: "FileText" },
  { href: "/versions/compare", label: "Version Compare", icon: "GitCompare" },
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

export const EXPERIENCE_TYPES = [
  "internship", "job", "startup", "project", "hackathon", "research",
  "campus-leadership", "club", "volunteer", "freelance", "class-project",
  "consulting", "business-project", "personal-project",
] as const;

export const BULLET_CATEGORIES = [
  "technical", "leadership", "business", "research", "project", "hackathon",
  "campus", "startup", "marketing", "finance", "data", "operations", "volunteer", "custom",
] as const;

export const BULLET_STATUSES = [
  "rough", "needs-work", "edited", "polished", "final", "archived",
] as const;

export const RESUME_TEMPLATES = [
  { id: "classic", name: "Classic Professional" },
  { id: "software", name: "Software Engineering" },
  { id: "business-intern", name: "Business Internship" },
  { id: "data-analyst", name: "Data Analyst" },
  { id: "startup", name: "Startup Founder" },
  { id: "research", name: "Research Focused" },
  { id: "dense-tech", name: "Dense Technical" },
] as const;

export const JOB_CATEGORIES = [
  "software-engineering", "frontend", "backend", "fullstack", "ai-ml",
  "data-science", "data-analyst", "business-analyst", "product-management",
  "finance", "marketing", "marketing-ops", "consulting", "research-assistant",
  "cybersecurity", "ux-design", "operations", "startup-bd", "campus", "leadership",
] as const;

export const APPLICATION_STATUSES = [
  "saved", "tailoring", "ready", "applied", "follow-up", "interview",
  "final-round", "rejected", "offer", "accepted", "archived",
] as const;

export const MATCH_STATUS_LABELS: Record<string, string> = {
  strong: "Strong Match",
  partial: "Partial Match",
  missing: "Missing",
  irrelevant: "Irrelevant",
  "needs-evidence": "Needs Evidence",
};
