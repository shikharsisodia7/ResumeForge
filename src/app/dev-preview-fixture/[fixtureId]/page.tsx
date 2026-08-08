import { notFound } from "next/navigation";
import { DocumentPreview } from "@/components/editor/document-preview";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";

/**
 * Renders a synthetic fixture's DocumentPreview with no auth/DB dependency,
 * so Playwright can assert real-browser layout (bounding boxes, print CSS)
 * against the actual component. Gated behind ALLOW_TEST_FIXTURES so it 404s
 * in any deployment that doesn't explicitly opt in — Vercel production
 * never sets this, only Playwright's local/CI webServer does. Fixture
 * content is fictional test data and must never be reachable by default.
 *
 * Deliberately NOT under a `_`-prefixed folder: Next.js's App Router treats
 * `_folder` as a private, non-routable convention and silently excludes it
 * from routing entirely — this route relies on the runtime env-var check
 * below for gating instead.
 */
export default async function DevPreviewFixturePage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  if (process.env.ALLOW_TEST_FIXTURES !== "true") {
    notFound();
  }

  const { fixtureId } = await params;
  let fixture: ReturnType<typeof fixtureById>;
  try {
    fixture = fixtureById(decodeURIComponent(fixtureId));
  } catch {
    notFound();
  }

  const style = { ...DEFAULT_RESUME_STYLE, ...fixture.styleOverrides };

  return (
    <div className="min-h-full bg-muted p-6">
      <DocumentPreview content={fixture.content} style={style} />
    </div>
  );
}
