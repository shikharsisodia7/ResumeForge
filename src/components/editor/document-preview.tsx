import type { ResumeContent } from "@/lib/schemas/resume-content";
import type { ResumeStyle, SectionKey } from "@/lib/schemas/resume-style";

const PAGE_PX: Record<ResumeStyle["pageSize"], { width: number; height: number }> = {
  letter: { width: 816, height: 1056 }, // 8.5x11in @ 96dpi
  a4: { width: 794, height: 1123 }, // 210x297mm @ 96dpi
};

const MARGIN_PX: Record<ResumeStyle["margins"], number> = {
  narrow: 42,
  normal: 64,
  wide: 85,
};

const FONT_STACK: Record<ResumeStyle["fontFamily"], string> = {
  helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
};

function dateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  additional: "Additional",
};

export function DocumentPreview({ content, style }: { content: ResumeContent; style: ResumeStyle }) {
  const page = PAGE_PX[style.pageSize];
  const margin = MARGIN_PX[style.margins];

  const headingStyle: React.CSSProperties = {
    fontWeight: style.sectionHeadingBold ? 700 : 400,
    fontSize: style.baseFontSize + 2,
    textTransform: style.sectionHeadingCase === "uppercase" ? "uppercase" : "capitalize",
    letterSpacing: style.sectionHeadingCase === "uppercase" ? "0.04em" : undefined,
    borderBottom: style.sectionHeadingDivider ? "1px solid #cbd5e1" : undefined,
    paddingBottom: style.sectionHeadingDivider ? 3 : 0,
    marginBottom: 8,
  };

  const contactParts = [
    content.basics.email,
    content.basics.phone,
    content.basics.location,
    ...content.basics.links.map((l) => l.url),
  ].filter(Boolean);

  function renderBullets(bullets: string[]) {
    if (bullets.length === 0) return null;
    return (
      <ul className="mt-1 space-y-0.5" style={{ paddingLeft: style.bulletIndent }}>
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <span aria-hidden="true">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderSection(key: SectionKey) {
    switch (key) {
      case "summary":
        if (!content.summary) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            <p>{content.summary}</p>
          </section>
        );
      case "education":
        if (content.education.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="flex justify-between gap-2 font-semibold">
                  <span className="min-w-0 flex-1 break-words">{edu.institution}</span>
                  <span className="shrink-0 whitespace-nowrap font-normal text-neutral-500">
                    {dateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                {(edu.degree || edu.fieldOfStudy) && (
                  <p className="italic text-neutral-600">
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                    {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                  </p>
                )}
                {renderBullets(edu.highlights)}
              </div>
            ))}
          </section>
        );
      case "experience":
        if (content.experience.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.experience.map((exp) => (
              <div key={exp.id} className="mb-2">
                <div className="flex justify-between gap-2 font-semibold">
                  <span className="min-w-0 flex-1 break-words">
                    {exp.title}
                    {exp.organization ? ` — ${exp.organization}` : ""}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-normal text-neutral-500">
                    {dateRange(exp.startDate, exp.endDate)}
                  </span>
                </div>
                {exp.location && <p className="italic text-neutral-600">{exp.location}</p>}
                {renderBullets(exp.bullets)}
              </div>
            ))}
          </section>
        );
      case "projects":
        if (content.projects.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.projects.map((proj) => (
              <div key={proj.id} className="mb-2">
                <div className="flex justify-between gap-2 font-semibold">
                  <span className="min-w-0 flex-1 break-words">
                    {proj.name}
                    {proj.role ? ` — ${proj.role}` : ""}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-normal text-neutral-500">
                    {dateRange(proj.startDate, proj.endDate)}
                  </span>
                </div>
                {renderBullets(proj.bullets)}
              </div>
            ))}
          </section>
        );
      case "skills":
        if (content.skills.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.skills.map((group) => (
              <p key={group.id} className="mb-0.5">
                <span className="font-semibold">{group.category}: </span>
                {group.items.join(", ")}
              </p>
            ))}
          </section>
        );
      case "certifications":
        if (content.certifications.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.certifications.map((cert) => (
              <div key={cert.id} className="flex justify-between gap-2">
                <span className="min-w-0 flex-1 break-words">
                  <span className="font-semibold">{cert.name}</span>
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                </span>
                <span className="shrink-0 whitespace-nowrap text-neutral-500">{cert.date}</span>
              </div>
            ))}
          </section>
        );
      case "awards":
        if (content.awards.length === 0) return null;
        return (
          <section key={key} style={{ marginBottom: style.sectionSpacing }}>
            <h2 style={headingStyle}>{SECTION_LABELS[key]}</h2>
            {content.awards.map((award) => (
              <div key={award.id} className="mb-1.5">
                <div className="flex justify-between gap-2 font-semibold">
                  <span className="min-w-0 flex-1 break-words">
                    {award.title}
                    {award.issuer ? ` — ${award.issuer}` : ""}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-normal text-neutral-500">{award.date}</span>
                </div>
                {award.description && <p>{award.description}</p>}
              </div>
            ))}
          </section>
        );
      case "additional":
        if (content.additional.length === 0) return null;
        return (
          <>
            {content.additional.map((s) => (
              <section key={s.id} style={{ marginBottom: style.sectionSpacing }}>
                <h2 style={headingStyle}>
                  {style.sectionHeadingCase === "uppercase" ? s.title.toUpperCase() : s.title}
                </h2>
                {renderBullets(s.items)}
              </section>
            ))}
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div
      className="paper mx-auto text-neutral-900"
      data-page-size={style.pageSize}
      style={{
        width: page.width,
        minHeight: page.height,
        padding: margin,
        fontFamily: FONT_STACK[style.fontFamily],
        fontSize: style.baseFontSize + 2,
        lineHeight: style.lineHeight,
      }}
    >
      <header
        className="mb-4"
        style={{ textAlign: style.headerAlignment === "center" ? "center" : "left" }}
      >
        <h1
          style={{
            fontWeight: style.nameFontWeight === "bold" ? 700 : 400,
            fontSize: style.nameFontSize + 4,
            marginBottom: 4,
          }}
        >
          {content.basics.fullName}
        </h1>
        {contactParts.length > 0 && (
          <p className="text-neutral-600" style={{ fontSize: style.baseFontSize }}>
            {contactParts.join("  •  ")}
          </p>
        )}
      </header>
      {style.sectionOrder.map(renderSection)}
    </div>
  );
}
