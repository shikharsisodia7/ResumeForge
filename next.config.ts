import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["pdf-parse", "mammoth", "@react-pdf/renderer", "@napi-rs/canvas"],
  // pdf-parse -> pdfjs-dist requires @napi-rs/canvas at runtime via a dynamic
  // require(), which Next's static output-file-tracing can't see — without
  // this it gets dropped from the deployed function bundle.
  outputFileTracingIncludes: {
    "/api/resumes/upload": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
    // src/lib/pdf/inspect.ts resolves pdfjs-dist's worker and standard-font
    // files via path.join(process.cwd(), "node_modules", "pdfjs-dist", ...)
    // instead of a require()/import() call, so output-file-tracing has
    // nothing statically traceable to follow — without this they get
    // dropped from the deployed function bundle.
    "/api/versions/[versionId]/checklist": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
};

export default nextConfig;
