const SECTION_HEADERS = [
  { key: "education", patterns: [/^(education|academic)/i] },
  { key: "skills", patterns: [/^(skills|technical skills|core competencies)/i] },
  { key: "experience", patterns: [/^(experience|work experience|professional experience|employment)/i] },
  { key: "projects", patterns: [/^(projects|personal projects|technical projects)/i] },
  { key: "leadership", patterns: [/^(leadership|activities|involvement)/i] },
  { key: "awards", patterns: [/^(awards|honors|achievements)/i] },
  { key: "research", patterns: [/^(research)/i] },
  { key: "certifications", patterns: [/^(certifications|licenses)/i] },
  { key: "activities", patterns: [/^(activities|extracurricular)/i] },
];

export interface ImportedSection {
  type: string;
  title: string;
  content: string;
}

export function parseResumeText(text: string): ImportedSection[] {
  const lines = text.split(/\n/);
  const sections: ImportedSection[] = [];
  let current: ImportedSection | null = null;

  const isHeader = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.length > 60) return null;
    for (const sh of SECTION_HEADERS) {
      if (sh.patterns.some((p) => p.test(trimmed))) {
        return sh.key;
      }
    }
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 40) {
      return "custom";
    }
    return null;
  };

  lines.forEach((line) => {
    const headerType = isHeader(line);
    if (headerType) {
      if (current) sections.push(current);
      current = { type: headerType, title: line.trim(), content: "" };
    } else if (current) {
      current.content += (current.content ? "\n" : "") + line;
    } else {
      if (!sections.find((s) => s.type === "header")) {
        sections.unshift({ type: "header", title: "Contact / Header", content: line });
      } else {
        sections[0].content += "\n" + line;
      }
    }
  });
  if (current) sections.push(current);

  return sections.filter((s) => s.content.trim());
}

export function extractBulletsFromSection(content: string): string[] {
  return content
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*●]/.test(l) || l.length > 20)
    .map((l) => l.replace(/^[•\-\*●]\s*/, ""));
}
