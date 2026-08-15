# ResumeForge formatting-quality audit

Evidence-based issue inventory from a stabilization pass over the formatting
pipeline: upload → extraction → AI formatting → customization → preview →
PDF → print. Every issue below was reproduced against the real pipeline
(the actual `@react-pdf/renderer` output for PDF-side issues, the actual
`DocumentPreview` component in a real Chromium layout engine for browser-side
issues) before being fixed — none are speculative.

Fixture IDs referenced below live in `src/fixtures/synthetic-resumes.ts`
(32 fixtures, all fictional data, gated out of any real UI/DB).

## Permanent formatting-quality checklist

This is the durable checklist this audit was run against. Keep it current —
when a new formatting bug class is found, add a line here and a fixture in
`src/fixtures/synthetic-resumes.ts`.

**Content fidelity** — dates, names, employers, schools, degrees, metrics,
URLs, emails, phone numbers survive formatting unchanged; no invented facts
(enforced by `src/lib/ai/fact-guard.ts`); no leaked AI commentary, Markdown
fences, or raw HTML/JSON (enforced by `src/lib/ai/leak-guard.ts`); prompt
injection inside uploaded resumes is inert (fixture 29).

**Grammar/typography** — spelling/grammar may be corrected without changing
meaning; consistent bullet glyph regardless of source marker; Unicode,
accents, em dashes, smart quotes render correctly (fixture 14); consistent
font family between preview and PDF (both use the same `style.fontFamily`
→ web-safe stack / PDF standard-14 font mapping, see `src/lib/pdf/layout.ts`
and the `FONT_STACK` in `document-preview.tsx`).

**Layout/spacing** — no horizontal overflow; long titles/employers/dates
wrap instead of colliding (fixtures 07, 08, 09, 23, 30); empty sections
never render a heading (fixtures 17, 18); consistent margins per the
`margins` style enum.

**Print/PDF consistency** — page count from the preview must equal the
real PDF's page count (surfaced via `/api/versions/[id]/pdf/page-count`,
not a DOM-height guess); dates/right-aligned metadata never clip past the
printable content width, verified in both the actual PDF bytes
(`src/lib/pdf/render.test.ts`) and real-browser layout
(`e2e/print-formatting.spec.ts`); Letter = 612×792pt exactly, A4 =
595.28×841.89pt exactly (`src/lib/pdf/layout.ts`); filenames are sanitized
(`sanitizeFilename`, pre-existing and verified correct).

## Issue inventory

### ISSUE-01 — Dates and long titles clip past the page's right edge in the downloaded PDF

- **Area**: PDF rendering (`src/lib/pdf/ResumeDocument.tsx`)
- **Severity**: Critical (the app's own stated source of truth was affected, not just ad hoc printing)
- **Reproduction**: Render fixtures `07-long-employer-name`, `08-long-job-title`, `09-long-date-range-present`, `23-long-certification-name`, `30-date-clipping-repro` through `renderResumePdf` and inspect text-item positions with `pdfjs-dist`.
- **Expected**: Every text item's right edge ≤ page width − right margin.
- **Actual (before fix)**: e.g. fixture 30's "September 2023 – Present" right edge measured 605.4pt against a safe boundary of 580.0pt on a 612pt-wide Letter page — 25.4pt off the page.
- **Root cause**: `entryHeaderRow`'s title `Text` had no `flexShrink`/`flexGrow`/`flexBasis` set. Yoga (react-pdf's layout engine) defaults `flexShrink` to `0` — unlike web CSS — so a long title held its full natural (unwrapped) width and pushed the sibling date `Text` past the page. The first fix attempt (`flexShrink: 1` with default `flexBasis: "auto"`) did make the title wrap, but a **second, independent** Yoga bug then miscomputed the sibling's position: isolated reproduction showed a short, non-wrapping title correctly placed the date flush at the page's right edge, while a long, *wrapping* title (same `flexShrink: 1` style) put the date 22pt too far right — proving Yoga's two-pass measurement mishandles the sibling's available width specifically when the `flexBasis: "auto"` item wraps. The working, verified fix uses the standard "fill remaining space" pattern (`flexGrow: 1, flexShrink: 1, flexBasis: 0`) instead, which does not hit that code path.
- **Fix**: `src/lib/pdf/ResumeDocument.tsx` — new `entryHeaderLeft` style (`flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 10`) applied to every entry-header title element; `entryDates` given `flexShrink: 0, flexGrow: 0` so it never compresses.
- **Status**: Fixed and verified.
- **Regression test**: `src/lib/pdf/render.test.ts` — "keeps every text item's right edge within the printable content area for every fixture" and the fixture-30-targeted date-visibility test. Both failed before the fix (5 violations) and pass after.

### ISSUE-02 — Same defect in the on-screen browser preview

- **Area**: `src/components/editor/document-preview.tsx`
- **Severity**: High
- **Reproduction**: Playwright, real Chromium, all 32 fixtures at `/dev-preview-fixture/<id>` (an unauthenticated, `ALLOW_TEST_FIXTURES`-gated dev-only route added for this purpose).
- **Root cause**: The five entry-header rows (education, experience, projects, certifications, awards) used Tailwind `flex justify-between` with no `min-w-0`/wrap control on the left span and no `shrink-0`/`whitespace-nowrap` on the date span. A long enough or unbroken-enough left string could overflow the row.
- **Fix**: Left span gets `min-w-0 flex-1 break-words`; date span gets `shrink-0 whitespace-nowrap`, applied consistently across all five entry types.
- **Status**: Fixed and verified.
- **Regression test**: `e2e/print-formatting.spec.ts` — one test per fixture (32 total) asserting every `.shrink-0.whitespace-nowrap` element's right edge stays within the `.paper` element's bounding box, plus a `scrollWidth`/`clientWidth` horizontal-overflow check.

### ISSUE-03 — No print stylesheet at all

- **Area**: `src/app/globals.css`
- **Severity**: Critical
- **Reproduction**: Inspected `globals.css` and every component for `@media print`, `@page`, or `window.print()` — none existed anywhere in the repository before this pass.
- **Expected**: Printing (Ctrl+P) isolates the resume page and maps it to the correct physical page size without the browser adding its own margins on top of the app's internal padding.
- **Actual (before fix)**: Printing the editor page would print the entire app chrome (sidebar, cards, muted background, box shadow) at whatever ad hoc pagination the browser's default print layout produced — a direct, independent cause of both "dates cut off" and "extra printed pages" reports, on top of ISSUE-01/02.
- **Root cause**: Never implemented. `VersionHeader`'s only export mechanism is "Download PDF" (the real, deterministic `@react-pdf/renderer` output); there was no dedicated print path or print-aware CSS at all.
- **Fix**: Added a `@media print` block: `@page { size: letter; margin: 0 }`, `body * { visibility: hidden }` / `.paper, .paper * { visibility: visible }` isolation, `.paper` repositioned to `position: absolute; top: 0; left: 0` at true physical dimensions (`8.5in`/`11in`, or `210mm`/`297mm` for `data-page-size="a4"`), shadow/radius removed for print.
- **Documented limitation**: CSS `@page` cannot be conditioned on the resume's configured page size (no such selector exists), so a browser print of an A4-configured resume still requests a Letter sheet from the OS print dialog — the `.paper` content itself is still sized correctly at A4 dimensions, but the requested sheet size is not. This is a known, inherent limitation of pure-CSS printing, not something fixable within this stack; "Download PDF" (which does respect the configured page size exactly) is the documented source of truth, per the product's own architecture.
- **Status**: Fixed (browser print is now a safe best-effort fallback); limitation documented above.
- **Regression test**: `e2e/print-formatting.spec.ts` — "print media hides app chrome and isolates .paper", "print stylesheet actually engages", "A4 fixtures set the correct data-page-size".

### ISSUE-04 — Preview and PDF/print page count can silently disagree

- **Area**: `src/components/editor/document-preview.tsx`, `src/components/editor/editor-client.tsx`
- **Severity**: Critical
- **Reproduction**: `DocumentPreview` renders as a single, continuously-growing `<div>` with `minHeight` but no page-break logic and no page-count output at all — a resume that is actually two pages' worth of content simply renders as one tall card with no visual indication.
- **Root cause**: Three independent layout engines exist (DOM preview height, browser print pagination, `@react-pdf/renderer`'s Yoga-based pagination) with **no shared source of truth**. The DOM preview in particular never asks "how many pages will this actually be" — it has no mechanism to ask that question, so the UI can claim "this looks like one page" while the real PDF is two.
- **Fix**: Rather than attempting to replicate Yoga's exact pagination algorithm in DOM (fragile, and the spec's own guidance permits deferring to the server renderer as the authority), the editor now fetches the real page count from a new `GET /api/versions/[id]/pdf/page-count` route — which renders the *actual* PDF via `renderResumePdf` and counts pages with `pdf-parse` — and displays it next to the preview ("1 page — matches the downloaded PDF exactly" / "N pages — ..."), refreshed whenever the version's `revision` changes. This makes the number the user sees *by construction* identical to the real PDF, rather than two independently-computed numbers that happen to usually agree.
- **Status**: Fixed for the preview/PDF pairing (now provably consistent by construction). Full browser-print pixel parity remains a documented, inherent limitation (see ISSUE-03) — "Download PDF" is the authoritative export path.
- **Regression test**: `src/lib/pdf/render.test.ts` — page-count assertions for fixtures `01` (1 page), `19` (2 pages, padded with enough real content to genuinely cross the boundary), `20`/`31` (1-page boundary fixtures), `21` (2 pages, one line over the boundary), plus a blank-trailing-page check.

### ISSUE-05 — No guard against leaked AI commentary/markup in resume content

- **Area**: `src/lib/ai/extraction.ts`, `src/lib/ai/customize.ts`
- **Severity**: Medium (not observed in practice with the current model/prompt, but no deterministic guard existed — the schema only validates shape, not that a string field is actually resume prose)
- **Reproduction**: `fixture 32-ai-commentary-leak` — a summary field containing `"Here is the formatted resume: ..."` passes `resumeContentSchema` validation with zero complaint, since it's a syntactically valid string.
- **Root cause**: `assertNoFabrication` (the existing fabrication guard) checks *new vs. base facts*, not *shape of prose* — a leaked preamble, Markdown fence, stray HTML tag, or model-internal token would sail through untouched. Also: `runExtraction` had no guard at all applied to its output (fabrication-guard only runs during customize, where there's a `baseContent` to diff against — extraction has none).
- **Fix**: New `src/lib/ai/leak-guard.ts` (`assertNoLeakedCommentary`) — a deterministic regex-based check for conversational preambles, Markdown fences, stray HTML tags, and model-internal tokens, wired into both `runExtraction` and `runCustomization`.
- **Status**: Fixed.
- **Regression test**: `src/lib/ai/leak-guard.test.ts` (5 tests: clean content passes, fixture 32 rejected, Markdown fence rejected, HTML tag rejected, no false-positive on ordinary text).

### ISSUE-06 (investigated, not a bug) — Non-breaking-space "no-op" regex in text normalization

- **Area**: `src/lib/files/extract.ts:13`
- **Reproduction**: `normalizeExtractedText`'s `.replace(/ /g, " ")` line looks like a visual no-op (replacing a space with a space).
- **Finding**: Byte-level inspection (`xxd`) confirmed the first character is `U+00A0` (non-breaking space, common in text copy-pasted from PDFs) being replaced with a real space — correct, intentional, working code. Documented here only because it's exactly the kind of thing that looks like a bug on casual reading and is worth a permanent note so a future pass doesn't "fix" it into an actual no-op.
- **Status**: Not a defect. No change made.

### ISSUE-07 (verified pre-existing, working correctly)

The following checklist items were investigated and found already correctly implemented, with no change needed:

- **Password-protected file detection**: `src/lib/files/extract.ts` catches `PasswordException` (PDF) and password/encryption-related error messages (DOCX) and returns a clear `ValidationError`.
- **Filename sanitization**: `sanitizeFilename` (`src/lib/files/validate.ts`) strips path separators and unsafe characters and is applied consistently to both the resume title and version name components of the generated PDF's filename.
- **Cross-user ownership isolation**: `requireOwnedResume`/`requireOwnedVersion`/`requireOwnedPrompt` (`src/lib/auth/ownership.ts`), covered by existing tests.
- **Fact fabrication guard**: `src/lib/ai/fact-guard.ts`, covered by existing tests — rejects invented statistics and named entities not traceable to the source resume.

### ISSUE-08 — Inconsistent ellipsis character in one placeholder string

- **Area**: `src/components/dashboard/duplicate-version-dialog.tsx`
- **Severity**: Cosmetic
- **Reproduction**: A dedicated UI-copy audit read every user-facing string in `src/components/**`, `src/app/**/page.tsx`, `README.md`, every `HttpError` subclass constructor call site (35 call sites), and every `toast.*` call (39 call sites). The job-description placeholder used a literal three-period `"..."` while every other loading/truncation string in the app (`"Uploading…"`, `"Formatting in progress…"`, `"Choose a saved prompt…"`, `"Search shared prompts…"`) consistently uses the Unicode ellipsis `…`.
- **Status**: Fixed — changed to `…` for consistency.
- **Coverage note**: No other spelling, grammar, punctuation, incomplete-sentence, or terminology-consistency issues were found across the full scan (35 error-message call sites, 39 toast calls, all component/page copy, README).

### ISSUE-09 (root-caused and fixed) — Two auth e2e tests failed on a stale assumption about the redirect chain

- **Area**: `e2e/auth-and-landing.spec.ts` (test code only — no application/auth code was touched)
- **Reproduction**: "visiting the dashboard/editor while signed out redirects to Auth0 login" asserted `toHaveURL(/\/auth\/login/)` after `page.goto()`.
- **Root cause**: Against a real, fully-configured Auth0 tenant, an unauthenticated visit to a protected route is a three-hop redirect chain: `/dashboard` → app's own `/auth/login?returnTo=...` → Auth0's `/authorize` → Auth0's hosted `/u/login` (the page that actually renders). `page.goto()` only resolves once the browser finishes the *entire* chain and renders a page — which is Auth0's hosted login screen, not the app's transient `/auth/login` hop, which the browser is never "on" long enough for `toHaveURL` to observe. The test's assumption only ever would have held in a broken/unconfigured Auth0 setup. Confirmed via `git diff` that no application auth code (`src/proxy.ts`, `src/lib/auth0.ts`, `src/lib/auth/*`) was touched — the app's behavior was always correct.
- **Fix**: Rewrote both tests to assert the actual security property that matters: (1) the protected page's content never rendered for a signed-out visitor, and (2) the app's own `/auth/login` redirect genuinely fired, verified by walking the response's redirect chain (`response.request().redirectedFrom()`) rather than checking the final URL.
- **Status**: Fixed and verified against the real, live Auth0 tenant — all 4 tests in this file now pass (`npx playwright test e2e/auth-and-landing.spec.ts` → 4 passed).

### ISSUE-10 — Live production AI pipeline was blocked by exhausted OpenAI account credits (external, not a code defect; now resolved)

- **Area**: Production environment (`resumeforge1.vercel.app`), not application code
- **Severity**: Was critical for the live product; external to this codebase
- **Original finding (2026-08-08)**: A real synthetic `.txt` resume uploaded through the live, authenticated production UI failed extraction. Vercel's runtime error logs showed every `/api/resumes/upload` failure carrying the same LangChain/OpenAI error: `429 You have no credits remaining.` This was a billing/account-balance issue on the connected OpenAI account, not a bug in the extraction code, prompt, or schema.
- **Positive finding along the way**: The dashboard showed "No resumes yet" both before and after the failed upload — confirming `createFormattedVersion`'s error path does **not** leave an orphaned `Resume` or half-created `ResumeVersion` row when the AI call fails, exactly as the architecture intends.
- **Current status (2026-08-15)**: Re-ran the live evaluation harness against the same six fixtures with a funded key: `RUN_AI_EVALS=true npm run test:ai-evals` → **6/6 passed** (schema-valid 6/6, fact-preservation 6/6, hallucinations 0, clipping violations 0, model errors 0). The account was funded between the original finding and this pass; no code change was needed or made.
- **Status**: Resolved (billing action taken by the account owner, outside this codebase).

### ISSUE-11 — Playwright's e2e suite silently attaches to the wrong app when its port is already occupied

- **Area**: `playwright.config.ts` (test infrastructure only — no application code)
- **Severity**: High (produces dozens of confusing false-negative failures with zero diagnostic; wastes significant developer time misdiagnosing a phantom regression)
- **Reproduction**: With an unrelated local project already bound to port 3100, `npx playwright test` reported **39 of 39 tests failing** — including basic auth-redirect checks that have no dependency on layout code. Inspecting a failure's `error-context.md` snapshot showed the page actually rendered was a completely unrelated project's marketing page, not ResumeForge, because `reuseExistingServer: !process.env.CI` treats "something answered on this port" as "the server is ready," with no check that it's actually this app.
- **Root cause**: `webServer.reuseExistingServer` has no identity check by design — on a machine that runs many local Node dev servers in parallel, any of them can already own the configured port, and the entire suite then silently tests the wrong application.
- **Fix**: Added `e2e/global-setup.ts` (wired via `playwright.config.ts`'s new `globalSetup` option), which calls `assertExpectedServer` (`src/lib/dev/assert-expected-server.ts`) to confirm the response at `baseURL` is actually ResumeForge's homepage before any test runs. A mismatch now throws one clear `WrongServerError` naming the problem and the fix, instead of 39 unrelated-looking failures.
- **Status**: Fixed and verified — reproduced the exact failure mode with the real port collision (one clear error, confirmed), then re-ran the full suite against ResumeForge's own build on a free port: **39/39 passed**. Note this class of collision cannot occur in CI (GitHub Actions runners don't have other local projects running, and `reuseExistingServer` is forced off when `CI` is set), so it's a local-development reliability fix, not a CI-correctness one.
- **Regression test**: `src/lib/dev/assert-expected-server.test.ts` — resolves for the real title, throws `WrongServerError` with a diagnostic message for a mismatched one.

### ISSUE-12 — Upload route silently exceeds Vercel's hard request-body limit for files between ~4.5 MB and the advertised 10 MB

- **Area**: `src/app/api/resumes/upload/route.ts` (now removed), `src/lib/files/constants.ts`
- **Severity**: Critical (a real production failure mode, not a documentation gap)
- **Reproduction**: The upload route called `request.formData()` then `file.arrayBuffer()` — buffering the entire multipart body into memory — before any size check ran. Confirmed via Vercel's own documentation (`/docs/functions/limitations`, fetched live during this pass) that **every** Vercel Functions plan (Hobby, Pro, Enterprise) caps request/response bodies at **4.5 MB**, returning a platform-level `413 FUNCTION_PAYLOAD_TOO_LARGE` before the function's own code — including its size-check logic — ever runs. This is not plan-dependent and cannot be raised by upgrading.
- **Root cause**: The route trusted the entire file to arrive as a single request body to a Vercel Function. The app advertised and validated against a 10 MB limit (`MAX_FILE_SIZE_BYTES`) that the platform itself would never let a request that large reach.
- **Fix**: Replaced the single-request upload with a direct-to-Blob client upload, per Vercel's own documented workaround for this exact limit:
  1. `POST /api/resumes/upload/authorize` — issues a short-lived (10 min), size- and content-type-constrained client token via `@vercel/blob/client`'s `handleUpload`. The client proposes a pathname; the server independently re-derives the authenticated user from the session (never trusting the client's claim) and rejects any pathname outside `resumes/<that user's own id>/` (`src/lib/storage/upload-pathname.ts`).
  2. The browser PUTs the file straight to Blob storage (`@vercel/blob/client`'s `upload()`), bypassing this app's own server entirely for the large transfer — the 4.5 MB cap never applies because no Vercel Function ever receives the file body.
  3. `POST /api/resumes/finalize` — a small JSON call (pathname + filename + title, well under any body limit) that re-derives the authenticated user, re-checks the pathname belongs to them, fetches the now-stored bytes server-side, and runs the *exact same* real content-sniffing validation (`validateUploadedFile`) the old route did — client-supplied file type and size are never trusted, only what the server observes in the actual bytes.
  - **Idempotency/races**: `Resume.storageKey` is now a `@unique` database column (migration `20260815211700_resume_storage_key_unique`). A finalize replay (retried request, double-click) for an already-processed object returns the original result instead of reprocessing; a genuine concurrent double-finalize race is resolved by letting the database's unique-constraint violation pick a winner, with the loser fetching and returning the winner's result rather than erroring.
  - **Cleanup**: a blob that fails content validation at finalize is deleted immediately. A blob whose client never calls finalize at all (e.g. the tab closes mid-flow) is not swept — this is an accepted, documented gap (see Known limitations below), not a silent failure mode, since it costs storage but is inert (never linked to a `Resume` row, invisible to any user, and blocked from reprocessing by ownership + validation either way).
- **Status**: Fixed. `MAX_FILE_SIZE_BYTES` stays at 10 MB — it's now enforced against real Blob-stored bytes, not a request the platform would have already rejected.
- **Regression test**: `src/lib/storage/upload-pathname.test.ts` (5 tests — including a same-prefix-but-different-user "10 vs 1" collision case), `src/app/api/resumes/upload/authorize/route.test.ts` (3 tests — unauthenticated rejection, cross-user pathname rejection, valid-path token issuance), `src/app/api/resumes/finalize/route.test.ts` (6 tests — cross-user pathname rejection, missing-object 404, idempotent replay, content-mismatch rejection + cleanup, successful finalize, concurrent-race resolution).

### ISSUE-13 (investigated, not fixed this pass) — Generation rate limit has a check-then-act race under concurrent requests

- **Area**: `src/lib/rate-limit.ts`
- **Severity**: Low-moderate (a soft cost/abuse guard, not a security boundary — worst case is a burst of AI calls modestly exceeding the intended per-minute cap, not unbounded abuse)
- **Finding**: `enforceGenerationRateLimit` counts recent `GenerationRun` rows and throws if at/over the limit, but the row for *this* request isn't created until later, inside `createFormattedVersion`/the customize/tailor flows — several requests issued concurrently by the same user can all pass the count check before any of them has inserted its row, exceeding `maxPerWindow`.
- **Root cause**: Check-then-act with no lock or atomic increment spanning the gap between the count and the eventual insert, which happens in a different function entirely (sometimes a different route).
- **Why not fixed this pass**: A correct fix needs the check and the eventual `GenerationRun` insert to happen inside one atomically-locked unit (e.g. a Postgres advisory lock scoped per user, held from the check through the insert) — that means touching the transaction boundaries of every AI call site (`resume-format.ts`, customize, tailor), not just `rate-limit.ts`. Given this is a soft cost guard rather than a security boundary, doing that safely across three call sites deserved its own focused pass with dedicated concurrency tests, rather than a same-session bolt-on next to the upload-architecture rewrite above.
- **Status**: Not fixed. Documented here as a known, reproducible gap with a concrete recommended fix (per-user advisory lock spanning check-through-insert) for the next pass.

## Fixture battery summary

32 fixtures in `src/fixtures/synthetic-resumes.ts`, spanning: grammar/typos,
mixed tense, duplicate bullets, missing punctuation, inconsistent date
formats, long employer/title/date strings, multiple roles/degrees at one
org, long URLs/emails, international phone numbers, Unicode/accented names,
dense skills sections, many short jobs, minimal/empty sections, two-page
content, one-page boundary (both sides), long project/certification text,
missing end dates, single-date entries, mixed bullet characters, stray
whitespace/tabs, out-of-order input, prompt injection, leaked AI
commentary, and the two targeted regression fixtures for ISSUE-01–04. Every
fixture carries a machine-readable `expect` block (required facts,
forbidden facts, expected page count) consumed directly by the test suites
above — not just descriptive text.
