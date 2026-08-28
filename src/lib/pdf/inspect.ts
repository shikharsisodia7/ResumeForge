import { createRequire } from "node:module";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
// Windows resolves this to a bare "C:\..." path, which the ESM loader
// rejects outright — it needs a proper file:// URL.
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

// Without this, pdf.js falls back to its own metric approximations for
// any non-embedded standard font (Helvetica, Times, etc.), warning
// "Ensure that the standardFontDataUrl API parameter is provided" on
// every page — and item widths (what the clipping check relies on)
// come from the same approximation instead of the real font metrics.
// Node's font-data loader hands this straight to fs.promises.readFile,
// which (unlike the worker's `new Worker(url)`) rejects "file://" URL
// strings as literal filenames — so this must stay a plain OS path,
// not pathToFileURL(...).href like workerSrc above.
const STANDARD_FONT_DATA_URL = `${dirname(require.resolve("pdfjs-dist/package.json"))}/standard_fonts/`;

export interface PdfTextItem {
  text: string;
  /** Left x-coordinate in PDF points, page-space (origin bottom-left). */
  x: number;
  /** Rendered width in PDF points. */
  width: number;
  /** pdf.js's internal font resource id for this run — stable per distinct
   * embedded font on a page, opaque otherwise. Used only to count distinct
   * fonts in use, never displayed. */
  fontName: string;
  /** Approximate font size in PDF points, derived from the text matrix. */
  fontSizePt: number;
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
  const doc = await getDocument({
    data,
    isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const pages: PdfPageInspection[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items
      // Some items are marked-content markers without a transform/str.
      .filter(
        (item): item is typeof item & { str: string; transform: number[]; width: number; fontName: string } =>
          "str" in item && "fontName" in item,
      )
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        width: item.width,
        fontName: item.fontName,
        fontSizePt: Math.round(Math.hypot(item.transform[0], item.transform[1]) * 100) / 100,
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
