import { PDFParse } from "pdf-parse";

/**
 * Counts pages in a generated PDF buffer. Used to give the browser preview a
 * page-count indicator sourced from the *actual* server-rendered PDF, rather
 * than a DOM-height guess — the preview and "Download PDF" must always agree
 * because they report the same number, not because two independent layout
 * engines happen to compute the same height.
 */
export async function countPdfPages(buffer: Buffer): Promise<number> {
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    return info.total;
  } finally {
    await parser.destroy();
  }
}
