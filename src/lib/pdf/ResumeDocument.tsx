import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fontFamilyNames, marginPt, pageSizePt, sectionHeadingText } from "@/lib/pdf/layout";
import type { ResumeContent } from "@/lib/schemas/resume-content";
import type { ResumeStyle } from "@/lib/schemas/resume-style";
import type { SectionKey } from "@/lib/schemas/resume-style";

function dateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

export function ResumeDocument({ content, style }: { content: ResumeContent; style: ResumeStyle }) {
  const fonts = fontFamilyNames(style);
  const margin = marginPt(style);
  const size = pageSizePt(style);

  const s = StyleSheet.create({
    page: {
      paddingTop: margin,
      paddingBottom: margin,
      paddingHorizontal: margin,
      fontFamily: fonts.regular,
      fontSize: style.baseFontSize,
      lineHeight: style.lineHeight,
      color: "#111111",
    },
    header: {
      marginBottom: style.sectionSpacing,
      alignItems: style.headerAlignment === "center" ? "center" : "flex-start",
    },
    name: {
      fontFamily: style.nameFontWeight === "bold" ? fonts.bold : fonts.regular,
      fontSize: style.nameFontSize,
      marginBottom: 4,
    },
    contactLine: {
      fontSize: style.baseFontSize - 1,
      color: "#333333",
    },
    section: {
      marginBottom: style.sectionSpacing,
    },
    sectionHeading: {
      fontFamily: style.sectionHeadingBold ? fonts.bold : fonts.regular,
      fontSize: style.baseFontSize + 1,
      marginBottom: 6,
      paddingBottom: style.sectionHeadingDivider ? 2 : 0,
      borderBottom: style.sectionHeadingDivider ? "0.75pt solid #999999" : undefined,
    },
    entry: {
      marginBottom: 8,
    },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    entryTitle: {
      fontFamily: fonts.bold,
    },
    entrySubtitle: {
      fontStyle: "italic",
      color: "#333333",
    },
    entryDates: {
      color: "#444444",
    },
    bulletRow: {
      flexDirection: "row",
      marginTop: 2,
      paddingLeft: style.bulletIndent,
    },
    bulletMark: {
      width: 10,
    },
    bulletText: {
      flex: 1,
    },
    link: {
      color: "#1d4ed8",
      textDecoration: "none",
    },
  });

  const renderBullets = (bullets: string[]) =>
    bullets.map((bullet, i) => (
      <View key={i} style={s.bulletRow} wrap={false}>
        <Text style={s.bulletMark}>•</Text>
        <Text style={s.bulletText}>{bullet}</Text>
      </View>
    ));

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "summary":
        if (!content.summary) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            <Text>{content.summary}</Text>
          </View>
        );

      case "education":
        if (content.education.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.education.map((edu) => (
              <View key={edu.id} style={s.entry} wrap={false}>
                <View style={s.entryHeaderRow}>
                  <Text style={s.entryTitle}>{edu.institution}</Text>
                  <Text style={s.entryDates}>{dateRange(edu.startDate, edu.endDate)}</Text>
                </View>
                {(edu.degree || edu.fieldOfStudy) && (
                  <Text style={s.entrySubtitle}>
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                    {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                  </Text>
                )}
                {renderBullets(edu.highlights)}
              </View>
            ))}
          </View>
        );

      case "experience":
        if (content.experience.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.experience.map((exp) => (
              <View key={exp.id} style={s.entry} wrap={false}>
                <View style={s.entryHeaderRow}>
                  <Text style={s.entryTitle}>
                    {exp.title}
                    {exp.organization ? ` — ${exp.organization}` : ""}
                  </Text>
                  <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                </View>
                {exp.location && <Text style={s.entrySubtitle}>{exp.location}</Text>}
                {renderBullets(exp.bullets)}
              </View>
            ))}
          </View>
        );

      case "projects":
        if (content.projects.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.projects.map((proj) => (
              <View key={proj.id} style={s.entry} wrap={false}>
                <View style={s.entryHeaderRow}>
                  <Text style={s.entryTitle}>
                    {proj.name}
                    {proj.role ? ` — ${proj.role}` : ""}
                  </Text>
                  <Text style={s.entryDates}>{dateRange(proj.startDate, proj.endDate)}</Text>
                </View>
                {proj.link && (
                  <Link src={proj.link} style={s.link}>
                    {proj.link}
                  </Link>
                )}
                {renderBullets(proj.bullets)}
              </View>
            ))}
          </View>
        );

      case "skills":
        if (content.skills.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.skills.map((group) => (
              <Text key={group.id} style={{ marginBottom: 2 }}>
                <Text style={s.entryTitle}>{group.category}: </Text>
                {group.items.join(", ")}
              </Text>
            ))}
          </View>
        );

      case "certifications":
        if (content.certifications.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.certifications.map((cert) => (
              <View key={cert.id} style={s.entryHeaderRow} wrap={false}>
                <Text>
                  <Text style={s.entryTitle}>{cert.name}</Text>
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                </Text>
                <Text style={s.entryDates}>{cert.date ?? ""}</Text>
              </View>
            ))}
          </View>
        );

      case "awards":
        if (content.awards.length === 0) return null;
        return (
          <View style={s.section} key={key}>
            <Text style={s.sectionHeading} minPresenceAhead={40}>
              {sectionHeadingText(key, style)}
            </Text>
            {content.awards.map((award) => (
              <View key={award.id} style={s.entry} wrap={false}>
                <View style={s.entryHeaderRow}>
                  <Text style={s.entryTitle}>
                    {award.title}
                    {award.issuer ? ` — ${award.issuer}` : ""}
                  </Text>
                  <Text style={s.entryDates}>{award.date ?? ""}</Text>
                </View>
                {award.description && <Text>{award.description}</Text>}
              </View>
            ))}
          </View>
        );

      case "additional":
        if (content.additional.length === 0) return null;
        return (
          <>
            {content.additional.map((section) => (
              <View style={s.section} key={section.id}>
                <Text style={s.sectionHeading} minPresenceAhead={40}>
                  {style.sectionHeadingCase === "uppercase" ? section.title.toUpperCase() : section.title}
                </Text>
                {renderBullets(section.items)}
              </View>
            ))}
          </>
        );

      default:
        return null;
    }
  };

  const contactParts = [
    content.basics.email,
    content.basics.phone,
    content.basics.location,
    ...content.basics.links.map((l) => l.url),
  ].filter(Boolean);

  return (
    <Document title={content.basics.fullName} producer="ResumeForge">
      <Page size={[size.width, size.height]} style={s.page} wrap>
        <View style={s.header}>
          <Text style={s.name}>{content.basics.fullName}</Text>
          {contactParts.length > 0 && <Text style={s.contactLine}>{contactParts.join("  •  ")}</Text>}
        </View>
        {style.sectionOrder.map(renderSection)}
      </Page>
    </Document>
  );
}
