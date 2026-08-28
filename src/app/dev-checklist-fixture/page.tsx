import { notFound } from "next/navigation";
import { ChecklistPanel } from "@/components/editor/checklist-panel";

/**
 * Renders ChecklistPanel with no auth/DB dependency, so Playwright can drive
 * the real component and stub only the network call
 * (`page.route("**\/api/versions/fixture-version/checklist")`). Gated behind
 * ALLOW_TEST_FIXTURES exactly like src/app/dev-preview-fixture — 404s in any
 * deployment that doesn't explicitly opt in.
 */
export default function DevChecklistFixturePage() {
  if (process.env.ALLOW_TEST_FIXTURES !== "true") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-md p-6">
      <ChecklistPanel versionId="fixture-version" revision={1} />
    </div>
  );
}
