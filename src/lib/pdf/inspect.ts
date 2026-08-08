import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
// Windows resolves this to a bare "C:\..." path, which the ESM loader
// rejects outright — it needs a proper file:// URL.
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

export interface PdfTextItem {
  text: string;
  /** Left x-coordinate in PDF points, page-space (origin bottom-left). */
  x: number;
  /** Rendered width in PDF points. */
  width: number;
}

export interface PdfPageInspection {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  items: PdfTextItem[];
  text: string;
}

export interface PdfInspection {
  pageCount: number;
  pages: PdfPageInspection[];
}

/**
 * Loads a generated PDF (an in-memory buffer, never a file on disk) and
 * extracts per-page text items with their x-position and width in PDF
 * points, so tests can assert that no text's right edge exceeds the page's
 * safe content area — something page-count or raw-text extraction alone
 * cannot detect.
 */
export async function inspectPdf(buffer: Buffer): Promise<PdfInspection> {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, isEvalSupported: false }).promise;
  const pages: PdfPageInspection[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items
      // Some items are marked-content markers without a transform/str.
      .filter((item): item is typeof item & { str: string; transform: number[]; width: number } => "str" in item)
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        width: item.width,
      }));
    pages.push({
      pageNumber,
      widthPt: viewport.width,
      heightPt: viewport.height,
      items,
      text: items.map((i) => i.text).join(""),
    });
  }

  await doc.destroy();
  return { pageCount: doc.numPages, pages };
}
