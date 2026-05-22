export type MatchStatus = "strong" | "partial" | "missing" | "irrelevant" | "needs-evidence";

export interface EvidenceItem {
  type: "bullet" | "project" | "skill" | "experience" | "education" | "certification" | "star";
  id: string;
  label: string;
  snippet?: string;
}

export interface KeywordAnalysis {
  term: string;
  category: string;
  importance: number;
  frequency: number;
  isRequired: boolean;
}

export interface RequirementMatch {
  requirement: string;
  category: string;
  status: MatchStatus;
  evidence: EvidenceItem[];
  notes?: string;
}

export interface TailoringRecommendation {
  type: "add-bullet" | "remove-bullet" | "add-project" | "add-experience" | "move-skill" | "rename-section" | "warning";
  id?: string;
  label: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface MatchReportData {
  overallScore: number;
  hardSkillScore: number;
  softSkillScore: number;
  keywordScore: number;
  experienceScore: number;
  projectScore: number;
  educationScore: number;
  responsibilityScore: number;
  atsFormatScore: number;
  evidenceStrength: number;
  tailoringConfidence: number;
  requirements: RequirementMatch[];
  missingKeywords: string[];
  strongKeywords: string[];
  weakKeywords: string[];
  skillsInJobNotResume: string[];
  skillsInResumeNotJob: string[];
  recommendedBulletsAdd: { id: string; text: string; score: number }[];
  recommendedBulletsRemove: { id: string; text: string; reason: string }[];
  recommendedProjects: { id: string; name: string }[];
  recommendedExperiences: { id: string; title: string }[];
  recommendedSkillsMove: string[];
  sectionWarnings: string[];
  scoreExplanation: string[];
  bestResumeVersionId?: string;
}

export interface JobTextAnalysis {
  keywords: KeywordAnalysis[];
  hardSkills: string[];
  softSkills: string[];
  tools: string[];
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
  roleVerbs: string[];
  businessKeywords: string[];
  themes: string[];
  rankedKeywords: KeywordAnalysis[];
}

export interface ATSReport {
  totalScore: number;
  formattingScore: number;
  keywordScore: number;
  skillsScore: number;
  bulletScore: number;
  impactScore: number;
  sectionScore: number;
  lengthScore: number;
  warnings: { message: string; priority: "high" | "medium" | "low" }[];
  fixes: { message: string; priority: "high" | "medium" | "low" }[];
}

export interface BulletScoreBreakdown {
  totalScore: number;
  actionVerb: number;
  specificTask: number;
  toolSkill: number;
  measurableImpact: number;
  clearOutcome: number;
  goodLength: number;
  noFiller: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  betterVerbs: string[];
  hasMetric: boolean;
  weakVerb?: string;
}

export interface ResumeContent {
  profile: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedIn?: string | null;
    github?: string | null;
    portfolio?: string | null;
    website?: string | null;
    summary?: string | null;
  };
  sections: {
    type: string;
    title: string;
    items: { id: string; content: string; subContent?: string }[];
  }[];
  plainText: string;
  bulletTexts: string[];
  skillNames: string[];
}

export interface TailoringResult {
  report: MatchReportData;
  recommendations: TailoringRecommendation[];
  selectedBullets: string[];
  selectedProjects: string[];
  selectedExperiences: string[];
  selectedSkills: string[];
  changesSummary: {
    addedBullets: string[];
    removedBullets: string[];
    movedSkills: string[];
    addedProjects: string[];
    removedContent: string[];
    scoreBefore: number;
    scoreAfter: number;
    warnings: string[];
  };
}
