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
  },
};

export default nextConfig;
