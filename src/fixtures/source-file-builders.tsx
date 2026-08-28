import { Document, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";

const pdfStyles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 48, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 11 },
  line: { marginBottom: 2 },
});

/**
 * Renders plain text lines as a bare, unstyled PDF — simulating a resume
 * exactly as a candidate would export it from a word processor, before it
 * ever reaches ResumeForge's own extraction/formatting pipeline. Used only
 * to build test fixtures; never imported from `src/app`.
 */
function SourcePdfDocument({ lines }: { lines: string[] }) {
  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        {lines.map((line, i) => (
          <Text key={i} style={pdfStyles.line}>
            {line}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export async function buildSourcePdf(lines: string[]): Promise<Buffer> {
  return renderToBuffer(SourcePdfDocument({ lines }));
}

/**
 * Renders plain text lines as a real, minimal .docx file (one paragraph per
 * line) — real OOXML bytes, so `mammoth` extraction is exercised end to end
 * rather than against a hand-crafted zip.
 */
export async function buildSourceDocx(lines: string[]): Promise<Buffer> {
  const doc = new DocxDocument({
    sections: [{ children: lines.map((line) => new Paragraph({ children: [new TextRun(line)] })) }],
  });
  return Packer.toBuffer(doc);
}
