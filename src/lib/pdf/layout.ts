import type { ResumeStyle } from "@/lib/schemas/resume-style";

const PAGE_SIZES_PT: Record<ResumeStyle["pageSize"], { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

const MARGINS_PT: Record<ResumeStyle["margins"], number> = {
  narrow: 32,
  normal: 48,
  wide: 64,
};

const FONT_FAMILIES: Record<ResumeStyle["fontFamily"], { regular: string; bold: string }> = {
  helvetica: { regular: "Helvetica", bold: "Helvetica-Bold" },
  times: { regular: "Times-Roman", bold: "Times-Bold" },
  courier: { regular: "Courier", bold: "Courier-Bold" },
};

export function pageSizePt(style: ResumeStyle) {
  return PAGE_SIZES_PT[style.pageSize];
}

export function marginPt(style: ResumeStyle) {
  return MARGINS_PT[style.margins];
}

export function fontFamilyNames(style: ResumeStyle) {
  return FONT_FAMILIES[style.fontFamily];
}

export function sectionHeadingText(key: string, style: ResumeStyle): string {
  const labels: Record<string, string> = {
    summary: "Summary",
    education: "Education",
    experience: "Experience",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    awards: "Awards",
    additional: "Additional",
  };
  const label = labels[key] ?? key;
  return style.sectionHeadingCase === "uppercase" ? label.toUpperCase() : label;
}
