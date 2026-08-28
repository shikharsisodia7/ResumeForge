export type ChecklistCategory =
  | "grammar"
  | "typos"
  | "formatting"
  | "margins"
  | "fonts"
  | "dates"
  | "page_count"
  | "hallucinations"
  | "missing_facts"
  | "pdf_safety";

export const CHECKLIST_CATEGORIES: { key: ChecklistCategory; label: string }[] = [
  { key: "grammar", label: "Grammar" },
  { key: "typos", label: "Typos" },
  { key: "formatting", label: "Formatting" },
  { key: "margins", label: "Margins" },
  { key: "fonts", label: "Fonts" },
  { key: "dates", label: "Dates" },
  { key: "page_count", label: "Page count" },
  { key: "hallucinations", label: "Hallucinations" },
  { key: "missing_facts", label: "Missing facts" },
  { key: "pdf_safety", label: "PDF safety" },
];

export type ChecklistItemKind = "mechanical" | "ai";

export interface ChecklistItemDefinition {
  id: string;
  category: ChecklistCategory;
  kind: ChecklistItemKind;
  label: string;
  description: string;
}

export const CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  { id: "GRAM-001", category: "grammar", kind: "ai", label: "Grammar", description: "Bullets and summary are grammatically correct." },
  { id: "GRAM-002", category: "grammar", kind: "ai", label: "Consistent tense", description: "Each role uses one consistent verb tense (past for prior roles, present for the current one)." },
  { id: "TYPO-001", category: "typos", kind: "ai", label: "Spelling", description: "No misspelled words." },
  { id: "TYPO-002", category: "typos", kind: "mechanical", label: "Duplicate words", description: "No immediately-repeated word (e.g. \"the the\")." },
  { id: "TYPO-003", category: "typos", kind: "ai", label: "Punctuation", description: "Bullets have consistent, correct terminal punctuation." },
  { id: "FMT-001", category: "formatting", kind: "ai", label: "Consistent bullet style", description: "Bullets within a role read as one consistent style." },
  { id: "FMT-002", category: "formatting", kind: "ai", label: "Consistent capitalization", description: "Headings and proper nouns are capitalized consistently." },
  { id: "FMT-003", category: "formatting", kind: "mechanical", label: "Line spacing", description: "Line height and section spacing are within safe, valid bounds." },
  { id: "FMT-004", category: "formatting", kind: "mechanical", label: "Chronological order", description: "Experience entries are ordered most-recent-first." },
  { id: "FMT-005", category: "formatting", kind: "mechanical", label: "No empty sections", description: "A section with zero entries doesn't render an empty heading." },
  { id: "FMT-006", category: "formatting", kind: "mechanical", label: "No duplicate sections", description: "Each section appears exactly once." },
  { id: "MARG-001", category: "margins", kind: "mechanical", label: "Margins", description: "No text renders outside the page's safe margin box." },
  { id: "MARG-002", category: "margins", kind: "mechanical", label: "No clipped text", description: "No text's right edge is cut off by the page edge." },
  { id: "MARG-003", category: "margins", kind: "mechanical", label: "Long names fit", description: "Long employer or school names wrap instead of overflowing." },
  { id: "FONT-001", category: "fonts", kind: "mechanical", label: "Consistent font family", description: "The document uses only its declared font family." },
  { id: "FONT-002", category: "fonts", kind: "mechanical", label: "Consistent font sizes", description: "Font sizes match the document's declared style, nothing stray." },
  { id: "DATE-001", category: "dates", kind: "mechanical", label: "Consistent date format", description: "Dates use one consistent format throughout." },
  { id: "DATE-002", category: "dates", kind: "mechanical", label: "Dates fully visible", description: "No date is cut off on the right edge of the page." },
  { id: "PAGE-001", category: "page_count", kind: "mechanical", label: "Stable page count", description: "Re-rendering the same content produces the same page count every time." },
  { id: "PAGE-002", category: "page_count", kind: "mechanical", label: "No blank trailing page", description: "The last page always has real content on it." },
  { id: "HALL-001", category: "hallucinations", kind: "mechanical", label: "No invented facts", description: "No statistic or named entity appears that isn't traceable to the source resume." },
  { id: "HALL-002", category: "hallucinations", kind: "mechanical", label: "Ignores embedded instructions", description: "Instruction-like text embedded in the resume is never followed." },
  { id: "FACT-001", category: "missing_facts", kind: "ai", label: "No dropped facts", description: "No employer, school, or role from the source resume is missing from the result." },
  { id: "FACT-002", category: "missing_facts", kind: "mechanical", label: "Expected sections present", description: "A section clearly present in the source text isn't missing from the result." },
  { id: "FACT-003", category: "missing_facts", kind: "mechanical", label: "Links preserved", description: "Every link/URL in the source survives, unbroken, into the result." },
  { id: "SAFE-001", category: "pdf_safety", kind: "mechanical", label: "No AI commentary leaked", description: "No conversational AI wrapper text (\"Here is your resume:\") leaked into content." },
  { id: "SAFE-002", category: "pdf_safety", kind: "mechanical", label: "No raw markdown or HTML", description: "No stray Markdown fences or HTML tags leaked into content." },
  { id: "SAFE-003", category: "pdf_safety", kind: "mechanical", label: "Unicode intact", description: "No mojibake or broken-encoding artifacts in the text." },
  { id: "SAFE-004", category: "pdf_safety", kind: "mechanical", label: "Unsupported files rejected", description: "This upload passed real content-based file-type validation." },
  { id: "SAFE-005", category: "pdf_safety", kind: "mechanical", label: "Corrupt files rejected", description: "This upload's bytes were successfully parsed, not just accepted by extension." },
  { id: "SAFE-006", category: "pdf_safety", kind: "mechanical", label: "PDF text is selectable", description: "The downloaded PDF has a real, selectable text layer, not a rasterized image." },
];

const CHECKLIST_ITEMS_BY_ID = new Map(CHECKLIST_ITEMS.map((item) => [item.id, item]));

/** Every item ID the AI must return exactly one verdict for. Kept here (not
 * re-derived by filtering) so ai-judged-schema.ts's z.enum tuple and this
 * list are trivially kept in sync by grep, and so a future item's `kind`
 * flip is a one-line diff in exactly two files (this filter is the source of
 * truth — evaluate-ai.ts imports it directly, see Task 10). */
export function checklistItemById(id: string): ChecklistItemDefinition {
  const item = CHECKLIST_ITEMS_BY_ID.get(id);
  if (!item) throw new Error(`Unknown checklist item id: ${id}`);
  return item;
}

export const AI_JUDGED_ITEM_IDS = CHECKLIST_ITEMS.filter((i) => i.kind === "ai").map((i) => i.id) as [string, ...string[]];
export const MECHANICAL_ITEM_IDS = CHECKLIST_ITEMS.filter((i) => i.kind === "mechanical").map((i) => i.id);
