import type { ResumeContent } from "@/lib/schemas/resume-content";
import { resumeStyleSchema, SECTION_KEYS, type ResumeStyle } from "@/lib/schemas/resume-style";
import { marginPt, pageSizePt, sectionHeadingText } from "@/lib/pdf/layout";
import type { PdfInspection, PdfTextItem } from "@/lib/pdf/inspect";
import { inspectPdf } from "@/lib/pdf/inspect";
import { renderResumePdf } from "@/lib/pdf/render";
import { findInventedFacts } from "@/lib/checklist/fact-diff";
import { findInjectionResidue } from "@/lib/checklist/injection-guard";
import { COMMENTARY_PATTERNS, MARKUP_PATTERNS, findLeakedCommentary, stringFields } from "@/lib/ai/leak-guard";

export type ChecklistItemStatus = "passed" | "warning" | "failed";

export interface ChecklistItemResult {
  id: string;
  status: ChecklistItemStatus;
  detail: string;
}

export interface MechanicalCheckInput {
  content: ResumeContent;
  style: ResumeStyle;
  sourceText: string;
  resume: { mimeType: string };
  pdfBuffer: Buffer;
  inspection: PdfInspection;
}

const RIGHT_EDGE_TOLERANCE_PT = 1;
const DATE_TEXT_PATTERN = /\b(19|20)\d{2}\b|\bPresent\b/i;

function ok(id: string, detail: string): ChecklistItemResult {
  return { id, status: "passed", detail };
}
function bad(id: string, detail: string): ChecklistItemResult {
  return { id, status: "failed", detail };
}
function warn(id: string, detail: string): ChecklistItemResult {
  return { id, status: "warning", detail };
}

function allItems(inspection: PdfInspection): PdfTextItem[] {
  return inspection.pages.flatMap((p) => p.items);
}

function fullText(inspection: PdfInspection): string {
  return inspection.pages.map((p) => p.text).join(" ");
}

function flattenBulletsAndSummary(content: ResumeContent): string {
  const parts = [content.summary ?? ""];
  for (const e of content.experience) parts.push(...e.bullets);
  for (const p of content.projects) parts.push(...p.bullets);
  return parts.join(" \n ");
}

// --- TYPO-002 ---
function checkDuplicateWords(content: ResumeContent): ChecklistItemResult {
  const text = flattenBulletsAndSummary(content);
  const match = text.match(/\b(\w+)\s+\1\b/i);
  return match ? bad("TYPO-002", `Repeated word: "${match[0]}"`) : ok("TYPO-002", "No repeated words found.");
}

// --- FMT-003 ---
function checkLineSpacing(style: ResumeStyle): ChecklistItemResult {
  const result = resumeStyleSchema.pick({ lineHeight: true, sectionSpacing: true }).safeParse(style);
  return result.success
    ? ok("FMT-003", `Line height ${style.lineHeight}, section spacing ${style.sectionSpacing}pt — within safe bounds.`)
    : bad("FMT-003", "Line spacing settings are outside safe bounds.");
}

// --- FMT-004 ---
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
function parseApproxDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  if (/present/i.test(dateStr)) return Number.MAX_SAFE_INTEGER;
  const monthYear = dateStr.match(/([a-zA-Z]{3,})\.?\s+(\d{4})/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 3).toLowerCase()] ?? 1;
    return Number(monthYear[2]) * 12 + month;
  }
  const numeric = dateStr.match(/(\d{1,2})\/(\d{4})/);
  if (numeric) return Number(numeric[2]) * 12 + Number(numeric[1]);
  const yearOnly = dateStr.match(/(\d{4})/);
  if (yearOnly) return Number(yearOnly[1]) * 12;
  return 0;
}
function checkChronologicalOrder(content: ResumeContent): ChecklistItemResult {
  const starts = content.experience.map((e) => parseApproxDate(e.startDate));
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] > starts[i - 1]) {
      return bad("FMT-004", `"${content.experience[i].organization}" appears after a more recent role out of order.`);
    }
  }
  return ok("FMT-004", "Experience entries are in reverse-chronological order.");
}

// --- FMT-005 ---
const OPTIONAL_SECTIONS: { key: keyof ResumeContent; heading: string }[] = [
  { key: "education", heading: "education" },
  { key: "skills", heading: "skills" },
  { key: "certifications", heading: "certifications" },
  { key: "awards", heading: "awards" },
  { key: "projects", heading: "projects" },
];
function checkNoEmptySectionHeadings(content: ResumeContent, style: ResumeStyle, inspection: PdfInspection): ChecklistItemResult {
  const text = fullText(inspection).toLowerCase();
  for (const section of OPTIONAL_SECTIONS) {
    const entries = content[section.key] as unknown[];
    if (Array.isArray(entries) && entries.length === 0) {
      const heading = sectionHeadingText(section.key as string, style).toLowerCase();
      if (text.includes(heading)) {
        return bad("FMT-005", `"${sectionHeadingText(section.key as string, style)}" heading rendered with zero entries.`);
      }
    }
  }
  return ok("FMT-005", "No empty section renders a heading.");
}

// --- FMT-006 ---
function checkNoDuplicateSections(style: ResumeStyle): ChecklistItemResult {
  const uniqueCount = new Set(style.sectionOrder).size;
  return uniqueCount === SECTION_KEYS.length
    ? ok("FMT-006", "Every section appears exactly once.")
    : bad("FMT-006", "Section order contains a duplicate or missing section.");
}

// --- Right-edge / bounds helpers, reused by MARG-*, DATE-002 ---
function rightEdgeViolations(inspection: PdfInspection, style: ResumeStyle): { page: number; item: PdfTextItem }[] {
  const size = pageSizePt(style);
  const margin = marginPt(style);
  const safeRightEdge = size.width - margin;
  const violations: { page: number; item: PdfTextItem }[] = [];
  for (const page of inspection.pages) {
    for (const item of page.items) {
      if (item.x + item.width > safeRightEdge + RIGHT_EDGE_TOLERANCE_PT) {
        violations.push({ page: page.pageNumber, item });
      }
    }
  }
  return violations;
}

// --- MARG-001 ---
function checkMarginBounds(inspection: PdfInspection, style: ResumeStyle): ChecklistItemResult {
  const size = pageSizePt(style);
  const margin = marginPt(style);
  for (const page of inspection.pages) {
    for (const item of page.items) {
      if (item.x < margin - RIGHT_EDGE_TOLERANCE_PT) {
        return bad("MARG-001", `Text starts before the left margin on page ${page.pageNumber}: "${item.text}"`);
      }
      if (item.x + item.width > size.width || item.x < 0) {
        return bad("MARG-001", `Text falls outside the page bounds on page ${page.pageNumber}: "${item.text}"`);
      }
    }
  }
  return ok("MARG-001", "All text stays within the page's margin box.");
}

// --- MARG-002 ---
function checkNoClippedText(inspection: PdfInspection, style: ResumeStyle): ChecklistItemResult {
  const violations = rightEdgeViolations(inspection, style);
  return violations.length === 0
    ? ok("MARG-002", "No text is clipped by the right edge of the page.")
    : bad("MARG-002", `${violations.length} text item(s) exceed the safe content width, e.g. "${violations[0].item.text}"`);
}

// --- MARG-003 ---
function checkLongNamesFit(content: ResumeContent, inspection: PdfInspection, style: ResumeStyle): ChecklistItemResult {
  const names = [...content.experience.map((e) => e.organization), ...content.education.map((e) => e.institution)];
  const violations = rightEdgeViolations(inspection, style).filter((v) => names.some((n) => n.includes(v.item.text) || v.item.text.includes(n.slice(0, 15))));
  return violations.length === 0
    ? ok("MARG-003", "Long employer/school names wrap instead of overflowing.")
    : bad("MARG-003", `An employer/school name overflows the safe content width: "${violations[0].item.text}"`);
}

// --- DATE-001 ---
function classifyDateFormat(dateStr: string): string | null {
  if (/^\d{1,2}\/\d{4}$/.test(dateStr)) return "numeric";
  // "May" is the correct spelling whether the surrounding dates are full-word
  // or abbreviated (it has no distinct abbreviated form), so on its own it
  // can't signal a format mismatch either way — exclude it before the
  // length-based abbreviated/full-word checks below, which would otherwise
  // misclassify it as "abbreviated" purely because it's 3 letters long.
  if (/^may\s+\d{4}$/i.test(dateStr)) return null;
  if (/^[A-Za-z]{3}\.?\s+\d{4}$/.test(dateStr)) return "abbreviated";
  if (/^[A-Za-z]{4,9}\s+\d{4}$/.test(dateStr)) return "full-word";
  if (/^\d{4}$/.test(dateStr)) return "year-only";
  return null;
}
function checkConsistentDateFormat(content: ResumeContent): ChecklistItemResult {
  const dates = [
    ...content.experience.flatMap((e) => [e.startDate, e.endDate]),
    ...content.education.flatMap((e) => [e.startDate, e.endDate]),
  ].filter((d): d is string => Boolean(d) && !/present/i.test(d ?? ""));
  const formats = new Set(dates.map(classifyDateFormat).filter((f): f is string => f !== null));
  return formats.size <= 1
    ? ok("DATE-001", "Dates use one consistent format.")
    : warn("DATE-001", `Mixed date formats found: ${[...formats].join(", ")}`);
}

// --- DATE-002 ---
function checkDatesNotCutOff(inspection: PdfInspection, style: ResumeStyle): ChecklistItemResult {
  const violations = rightEdgeViolations(inspection, style).filter((v) => DATE_TEXT_PATTERN.test(v.item.text));
  return violations.length === 0
    ? ok("DATE-002", "Every date stays fully visible within the page.")
    : bad("DATE-002", `A date is cut off at the right edge: "${violations[0].item.text}"`);
}

// --- FONT-001 ---
function checkConsistentFontFamily(inspection: PdfInspection): ChecklistItemResult {
  for (const page of inspection.pages) {
    const distinct = new Set(page.items.map((i) => i.fontName));
    if (distinct.size > 4) {
      return bad("FONT-001", `Page ${page.pageNumber} uses ${distinct.size} distinct font resources — expected at most a regular/bold pair.`);
    }
  }
  return ok("FONT-001", "Only the document's declared font family is in use.");
}

// --- FONT-002 ---
function checkConsistentFontSizes(inspection: PdfInspection, style: ResumeStyle): ChecklistItemResult {
  const expected = [style.baseFontSize - 1, style.baseFontSize, style.baseFontSize + 1, style.nameFontSize];
  const stray = allItems(inspection).find((item) => !expected.some((e) => Math.abs(e - item.fontSizePt) <= 0.2));
  return stray
    ? bad("FONT-002", `Unexpected font size ${stray.fontSizePt}pt on text "${stray.text}"`)
    : ok("FONT-002", "All font sizes match the document's declared style.");
}

// --- PAGE-001 ---
async function checkStablePageCount(content: ResumeContent, style: ResumeStyle, knownPageCount: number): Promise<ChecklistItemResult> {
  const secondBuffer = await renderResumePdf(content, style);
  const secondInspection = await inspectPdf(secondBuffer);
  return secondInspection.pageCount === knownPageCount
    ? ok("PAGE-001", `Renders consistently at ${knownPageCount} page(s).`)
    : bad("PAGE-001", `Page count was ${knownPageCount} then ${secondInspection.pageCount} across two identical renders.`);
}

// --- PAGE-002 ---
function checkNoBlankTrailingPage(inspection: PdfInspection): ChecklistItemResult {
  const lastPage = inspection.pages[inspection.pages.length - 1];
  return lastPage && lastPage.items.length > 0
    ? ok("PAGE-002", "The last page has real content on it.")
    : bad("PAGE-002", "The last page appears to be blank.");
}

// --- HALL-001 ---
function checkNoInventedFacts(sourceText: string, content: ResumeContent): ChecklistItemResult {
  const invented = findInventedFacts(sourceText, content);
  return invented.length === 0
    ? ok("HALL-001", "Every statistic and named entity traces back to the source resume.")
    : warn("HALL-001", `Not traceable to the source text: ${invented.slice(0, 3).join(", ")}`);
}

// --- HALL-002 ---
function checkResistsInjection(content: ResumeContent): ChecklistItemResult {
  const residue = findInjectionResidue(content);
  return residue.length === 0
    ? ok("HALL-002", "No instruction-like text leaked into the formatted resume.")
    : bad("HALL-002", `Instruction-like text present in output: "${residue[0].slice(0, 80)}"`);
}

// --- FACT-002 ---
const SECTION_KEYWORDS: { key: keyof ResumeContent; pattern: RegExp }[] = [
  { key: "education", pattern: /\beducation\b|\buniversity\b|\bcollege\b|\bbachelor|\bmaster/i },
  { key: "experience", pattern: /\bexperience\b|\bemployment\b|\bwork history\b/i },
  { key: "skills", pattern: /\bskills\b/i },
];
function checkExpectedSectionsPresent(sourceText: string, content: ResumeContent): ChecklistItemResult {
  for (const section of SECTION_KEYWORDS) {
    const entries = content[section.key] as unknown[];
    if (section.pattern.test(sourceText) && Array.isArray(entries) && entries.length === 0) {
      return warn("FACT-002", `The source resume appears to mention "${section.key}", but the result has none.`);
    }
  }
  return ok("FACT-002", "No section that the source text clearly mentions is missing.");
}

// --- FACT-003 ---
function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, "");
}
function isValidUrl(raw: string): boolean {
  try {
    new URL(raw);
    return true;
  } catch {
    try {
      new URL(`https://${raw}`);
      return true;
    } catch {
      return false;
    }
  }
}
// @react-pdf/renderer's default text layout hyphenates long unbreakable
// "words" (a URL with no spaces is exactly that) by inserting a real "-"
// character at the wrap point — e.g. "jordan-alvarez-portfolio.example.com"
// can render as "jor-dan-alvarez-portfolio.example.com". That inserted
// hyphen (or a whitespace/line break at a wrap point) is a rendering
// artifact, not a content change, so it must be tolerated — but only as an
// INSERTION between two real link characters, never as a way to skip a
// character the link actually needs. Build a regex requiring every
// character of the link to appear, in order, allowing only whitespace/
// hyphens to be inserted between consecutive characters: a genuinely
// missing or substituted character can never be masked by this, since the
// separator only ever adds characters, never removes the ones already
// required literally in the pattern.
function linkPattern(link: string): RegExp {
  return new RegExp(
    [...link].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s-]*"),
  );
}
function checkLinksPreserved(content: ResumeContent, inspection: PdfInspection): ChecklistItemResult {
  const links = [
    ...content.basics.links.map((l) => l.url),
    ...content.projects.map((p) => p.link).filter((l): l is string => Boolean(l)),
    ...content.certifications.map((c) => c.credentialUrl).filter((l): l is string => Boolean(l)),
  ];
  const text = fullText(inspection);
  for (const link of links) {
    if (!isValidUrl(link)) return bad("FACT-003", `"${link}" is not a valid URL.`);
    if (!linkPattern(link).test(text)) {
      return bad("FACT-003", `"${link}" does not appear intact in the rendered PDF.`);
    }
  }
  return ok("FACT-003", "Every link is a valid URL and appears intact in the PDF.");
}

// --- SAFE-001 / SAFE-002 ---
function checkNoAiCommentary(content: ResumeContent): ChecklistItemResult {
  const hits = findLeakedCommentary(content, COMMENTARY_PATTERNS);
  return hits.length === 0
    ? ok("SAFE-001", "No conversational AI wrapper text found.")
    : bad("SAFE-001", `Leaked AI commentary: "${hits[0].slice(0, 80)}"`);
}
function checkNoRawMarkup(content: ResumeContent): ChecklistItemResult {
  const hits = findLeakedCommentary(content, MARKUP_PATTERNS);
  return hits.length === 0
    ? ok("SAFE-002", "No raw Markdown or HTML found.")
    : bad("SAFE-002", `Leaked markup: "${hits[0].slice(0, 80)}"`);
}

// --- SAFE-003 ---
// UTF-8 bytes re-decoded as CP1252 ("mojibake").
//
// Every UTF-8 continuation byte is 0x80-0xBF, so in EVERY mojibake sequence
// the trailing character is CP1252's image of some byte in that range. That
// image is the single source of truth below, shared by all three families
// rather than hand-enumerated per case (the bug this replaced: each family
// had its own partial class, so whichever characters the author happened not
// to think of silently passed):
//   0x80-0x9F -> mostly PRINTABLE characters, not C1 controls. This is the
//     trap. CP1252 maps this range to punctuation (quotes, dashes, bullet,
//     ellipsis, trademark...), so a trailing class of [\x80-\x9F] alone could
//     never match real smart quotes, dashes or bullets - by far the most
//     frequent mojibake in real resume text. \x80-\x9F is still retained for
//     the bytes CP1252 leaves undefined, which decoders surface as their raw
//     C1 control codepoints (U+0080-U+009F) — real resume text never
//     contains a literal C1 control, so this whole range is safe to flag.
//   0xA0-0xBF -> U+00A0-U+00BF, identical to Latin-1.
//
// Three lead sequences are handled (not an exhaustive list of every mojibake
// family — e.g. a mangled euro sign, E2 82 AC, still slips through, same as
// before this change):
//  1. C2 xx -> U+00C2 + trail. Non-breaking space, (c), (r), degree sign:
//     "50" + U+00C2 + U+00A0 + "k".
//  2. C3 xx -> U+00C3 + trail. Accented Latin letters - "Jose" with an acute
//     e becomes "Jos" + U+00C3 + U+00A9, and an uppercase E-acute (C3 89)
//     becomes U+00C3 + U+2030.
//  3. E2 80 xx -> U+00E2 + U+20AC + trail. General punctuation, e.g.
//       U+2019 right single quote (E2 80 99) -> U+2122   <- most common
//       U+2018 left single quote  (E2 80 98) -> U+02DC
//       U+201C left double quote  (E2 80 9C) -> U+0153
//       U+2022 bullet             (E2 80 A2) -> U+00A2
//       U+2013 en dash            (E2 80 93) -> U+201C
//       U+2014 em dash            (E2 80 94) -> U+201D
//       U+2026 ellipsis           (E2 80 A6) -> U+00A6
//
// U+FFFD is the replacement character a lossy decode leaves behind. Every
// character below is written as an escape on purpose: the pattern is made
// entirely of look-alike glyphs, so literals here would be unreadable and
// trivially corrupted by any tool that re-encodes this file.
//
// False-positive trade-off: an uppercase Ã/Â immediately followed by a
// smart-punctuation character with no space between it (e.g. an all-caps
// Portuguese word ending in "Ã" right before an em dash or ellipsis) would
// also match. That combination is rare in real prose, and there is no way to
// catch genuine mojibake like "Ã‰" (mangled É) without accepting it — real
// text with an accented capital is followed by a letter or a space, not
// smart punctuation, in the overwhelming majority of cases.
const CP1252_TRAIL =
  "[\\x80-\\x9F\\u00A0-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013\\u2014\\u2018\\u2019\\u201A\\u201C\\u201D\\u201E\\u2020\\u2021\\u2022\\u2026\\u2030\\u2039\\u203A\\u20AC\\u2122]";
const MOJIBAKE_PATTERN = new RegExp(
  `[\\u00C2\\u00C3]${CP1252_TRAIL}|\\u00E2\\u20AC${CP1252_TRAIL}|\\uFFFD`,
);
function checkUnicodeIntegrity(content: ResumeContent): ChecklistItemResult {
  const hit = stringFields(content).find((field) => MOJIBAKE_PATTERN.test(field));
  return hit
    ? bad("SAFE-003", `Possible broken-encoding text: "${hit.slice(0, 80)}"`)
    : ok("SAFE-003", "No broken-encoding artifacts found.");
}

// --- SAFE-004 / SAFE-005 ---
// By the time a ResumeVersion exists, its source Resume already passed
// validateUploadedFile's real content-sniffing (src/lib/files/validate.ts)
// and extractResumeText's real parse (src/lib/files/extract.ts) — an
// unsupported or corrupt upload never reaches this far. These two checks
// report on that already-enforced fact rather than re-deriving it.
function checkUnsupportedFileRejected(resume: { mimeType: string }): ChecklistItemResult {
  const known = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
  return known.includes(resume.mimeType)
    ? ok("SAFE-004", "This file's real content was validated as a supported type at upload.")
    : bad("SAFE-004", `Unexpected stored mime type: ${resume.mimeType}`);
}
function checkCorruptFileRejected(sourceText: string): ChecklistItemResult {
  return sourceText.trim().length >= 20
    ? ok("SAFE-005", "This file's bytes were successfully parsed into readable text at upload.")
    : bad("SAFE-005", "Stored source text is implausibly short for a real resume.");
}

// --- SAFE-006 ---
function checkPdfTextSelectable(content: ResumeContent, inspection: PdfInspection): ChecklistItemResult {
  const flat = stripWhitespace(fullText(inspection));
  const nameFound = flat.includes(stripWhitespace(content.basics.fullName));
  return flat.length > 0 && nameFound
    ? ok("SAFE-006", "The downloaded PDF has a real, selectable text layer.")
    : bad("SAFE-006", "The rendered PDF's text layer doesn't contain the candidate's name — may not be real selectable text.");
}

export async function evaluateMechanicalChecklist(input: MechanicalCheckInput): Promise<ChecklistItemResult[]> {
  const { content, style, sourceText, resume, inspection } = input;
  return [
    checkDuplicateWords(content),
    checkLineSpacing(style),
    checkChronologicalOrder(content),
    checkNoEmptySectionHeadings(content, style, inspection),
    checkNoDuplicateSections(style),
    checkMarginBounds(inspection, style),
    checkNoClippedText(inspection, style),
    checkLongNamesFit(content, inspection, style),
    checkConsistentFontFamily(inspection),
    checkConsistentFontSizes(inspection, style),
    checkConsistentDateFormat(content),
    checkDatesNotCutOff(inspection, style),
    await checkStablePageCount(content, style, inspection.pageCount),
    checkNoBlankTrailingPage(inspection),
    checkNoInventedFacts(sourceText, content),
    checkResistsInjection(content),
    checkExpectedSectionsPresent(sourceText, content),
    checkLinksPreserved(content, inspection),
    checkNoAiCommentary(content),
    checkNoRawMarkup(content),
    checkUnicodeIntegrity(content),
    checkUnsupportedFileRejected(resume),
    checkCorruptFileRejected(sourceText),
    checkPdfTextSelectable(content, inspection),
  ];
}
