import {
  STOP_WORDS,
  CATEGORY_KEYWORDS,
  DEFAULT_DICTIONARIES,
  TECH_PATTERNS,
  RESPONSIBILITY_VERBS,
} from "@/lib/dictionaries/default-keywords";
import type { JobTextAnalysis, KeywordAnalysis } from "@/lib/types";

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s+#.+/-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function extractPhrases(tokens: string[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const phrase = tokens.slice(i, i + n).join(" ");
    if (phrase.split(" ").every((w) => !STOP_WORDS.has(w))) {
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }
  return counts;
}

function categorizeTerm(term: string, customDict?: Record<string, string[]>): string {
  const lower = term.toLowerCase();
  const dicts = { ...DEFAULT_DICTIONARIES, ...customDict };
  for (const [cat, terms] of Object.entries(dicts)) {
    if (terms.some((t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))) {
      return cat;
    }
  }
  for (const [cat, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    if (terms.some((t) => lower === t || lower.includes(t) || t.includes(lower))) {
      return cat;
    }
  }
  return "general";
}

function isRequiredSection(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("required") ||
    lower.includes("must have") ||
    lower.includes("minimum qualifications") ||
    lower.includes("requirements")
  );
}

function isPreferredSection(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("preferred") || lower.includes("nice to have") || lower.includes("bonus");
}

export function analyzeJobDescription(
  text: string,
  title: string,
  category: string,
  customDict?: Record<string, string[]>
): JobTextAnalysis {
  const cleaned = cleanText(text);
  const lower = cleaned.toLowerCase();
  const sentences = cleaned.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const tokens = tokenize(cleaned);
  const wordFreq = new Map<string, number>();
  tokens.forEach((t) => wordFreq.set(t, (wordFreq.get(t) ?? 0) + 1));

  const phrase2 = extractPhrases(tokens, 2);
  const phrase3 = extractPhrases(tokens, 3);

  const requiredSection = sentences.filter((s) => isRequiredSection(s)).join(" ");
  const preferredSection = sentences.filter((s) => isPreferredSection(s)).join(" ");

  const techMatches = [...cleaned.matchAll(TECH_PATTERNS)].map((m) => m[0].toLowerCase());
  const uniqueTech = [...new Set(techMatches)];

  const categoryTerms = customDict?.[category] ?? DEFAULT_DICTIONARIES[category] ?? [];
  const matchedCategory = categoryTerms.filter((t) => lower.includes(t.toLowerCase()));

  const roleVerbs = RESPONSIBILITY_VERBS.filter((v) => lower.includes(v));
  const responsibilities = sentences.filter((s) =>
    RESPONSIBILITY_VERBS.some((v) => s.toLowerCase().includes(v))
  ).slice(0, 15);

  const expMatch = lower.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi);
  const experienceRequirements = expMatch ? [...expMatch] : [];
  const educationRequirements = sentences.filter((s) =>
    /bachelor|master|phd|degree|gpa|computer science|engineering|mba/i.test(s)
  );

  const requiredQualifications = sentences.filter((s) =>
    requiredSection && s.length < 200 && (s.toLowerCase().includes("required") || requiredSection.includes(s.slice(0, 30)))
  ).slice(0, 10);

  const preferredQualifications = sentences.filter((s) =>
    preferredSection && /preferred|nice|bonus/i.test(s)
  ).slice(0, 10);

  const keywordMap = new Map<string, KeywordAnalysis>();

  const addKeyword = (term: string, baseImportance: number, isRequired: boolean, freq: number) => {
    const key = term.toLowerCase().trim();
    if (key.length < 2) return;
    const existing = keywordMap.get(key);
    const cat = categorizeTerm(key, customDict);
    const importance = Math.min(100, baseImportance + freq * 5 + (isRequired ? 20 : 0));
    if (!existing || existing.importance < importance) {
      keywordMap.set(key, {
        term: key,
        category: cat,
        importance,
        frequency: (existing?.frequency ?? 0) + freq,
        isRequired,
      });
    }
  };

  wordFreq.forEach((freq, term) => {
    if (freq >= 2 || CATEGORY_KEYWORDS.programming?.includes(term)) {
      const inRequired = requiredSection.toLowerCase().includes(term);
      addKeyword(term, inRequired ? 70 : 40, inRequired, freq);
    }
  });

  phrase2.forEach((freq, phrase) => {
    if (freq >= 2) addKeyword(phrase, 55, requiredSection.toLowerCase().includes(phrase), freq);
  });

  phrase3.forEach((freq, phrase) => {
    if (freq >= 2) addKeyword(phrase, 60, requiredSection.toLowerCase().includes(phrase), freq);
  });

  uniqueTech.forEach((t) => addKeyword(t, 75, requiredSection.toLowerCase().includes(t), 2));
  matchedCategory.forEach((t) => addKeyword(t, 65, false, 2));

  const titleWords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  titleWords.forEach((w) => addKeyword(w, 80, true, 3));

  const keywords = [...keywordMap.values()].sort((a, b) => b.importance - a.importance);
  const rankedKeywords = keywords.slice(0, 80);

  const hardSkills = keywords
    .filter((k) =>
      ["programming", "frameworks", "databases", "ai-ml", "data-analysis", "tools", "software-engineering", "frontend", "backend", "fullstack", "data-science", "data-analyst", "cybersecurity"].includes(k.category)
    )
    .map((k) => k.term)
    .slice(0, 30);

  const softSkills = keywords
    .filter((k) => k.category === "soft-skills" || k.category === "leadership")
    .map((k) => k.term);

  const tools = [...uniqueTech, ...keywords.filter((k) => k.category === "tools").map((k) => k.term)];

  const businessKeywords = keywords
    .filter((k) => ["business", "finance", "marketing", "product", "consulting"].includes(k.category))
    .map((k) => k.term);

  const themes = [...new Set([category, ...matchedCategory.slice(0, 3)])];

  return {
    keywords,
    rankedKeywords,
    hardSkills,
    softSkills,
    tools: [...new Set(tools)].slice(0, 25),
    responsibilities: responsibilities.slice(0, 12),
    requiredQualifications: requiredQualifications.length ? requiredQualifications : sentences.slice(0, 5),
    preferredQualifications,
    experienceRequirements,
    educationRequirements,
    roleVerbs,
    businessKeywords,
    themes,
  };
}

export function buildResumeText(parts: {
  bullets: { id: string; text: string }[];
  skills: { name: string }[];
  projects: { name: string; shortDescription?: string | null; techStack?: string | null }[];
  experiences: { title: string; organization: string; description?: string | null }[];
  educations: { school: string; degree?: string | null; major?: string | null; coursework?: string | null }[];
  summary?: string | null;
}): string {
  const chunks: string[] = [];
  if (parts.summary) chunks.push(parts.summary);
  parts.skills.forEach((s) => chunks.push(s.name));
  parts.bullets.forEach((b) => chunks.push(b.text));
  parts.projects.forEach((p) => {
    chunks.push(p.name);
    if (p.shortDescription) chunks.push(p.shortDescription);
    if (p.techStack) chunks.push(p.techStack);
  });
  parts.experiences.forEach((e) => {
    chunks.push(`${e.title} ${e.organization}`);
    if (e.description) chunks.push(e.description);
  });
  parts.educations.forEach((e) => {
    chunks.push(`${e.school} ${e.degree ?? ""} ${e.major ?? ""}`);
    if (e.coursework) chunks.push(e.coursework);
  });
  return chunks.join("\n").toLowerCase();
}
