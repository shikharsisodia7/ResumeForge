import { notFound } from "next/navigation";
import { ChecklistPanel } from "@/components/editor/checklist-panel";

/**
 * Renders ChecklistPanel with no auth/DB dependency, so Playwright can drive
 * the real component and stub only the network call
 * (`page.route("**\/api/versions/fixture-version/checklist")`). Gated behind
 * the same ALLOW_TEST_FIXTURES check as src/app/dev-preview-fixture, but
 * unlike that sibling route, this page has no dynamic route param to force
 * per-request rendering — with no forcing mechanism, Next.js would treat it
 * as static and evaluate the check once at `next build` time, permanently
 * baking that build's flag value into the prerendered output regardless of
 * the runtime environment. `force-dynamic` below makes the check run fresh
 * on every request instead, so it actually reflects the deployment's real
 * runtime env var.
 */
export const dynamic = "force-dynamic";

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
