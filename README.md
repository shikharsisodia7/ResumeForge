# ResumeForge

[![CI](https://github.com/shikharsisodia7/ResumeForge/actions/workflows/ci.yml/badge.svg)](https://github.com/shikharsisodia7/ResumeForge/actions/workflows/ci.yml)

AI resume formatting: upload a resume, an AI agent extracts and organizes it into structured,
ATS-friendly content, you customize the layout with plain-English instructions, tailor it per job
opening, and export a real, selectable-text PDF.

## Architecture

- **App**: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- **Auth**: [@auth0/nextjs-auth0 v4](https://github.com/auth0/nextjs-auth0) — session handled entirely by
  Auth0's own `/auth/login`, `/auth/logout`, `/auth/callback` routes, mounted via `src/proxy.ts`
- **Database**: PostgreSQL via Prisma (`prisma/schema.prisma`) — `User`, `Resume`, `ResumeVersion`,
  `CustomPrompt`, `VersionPrompt` (join), `GenerationRun` (AI audit log)
- **Storage**: Vercel Blob, `access: 'private'` — uploaded resumes and rendered PDFs are never
  publicly reachable by URL; every read goes through an authenticated, ownership-checked API route
- **AI**: LangChain (`@langchain/openai`) with `ChatOpenAI.withStructuredOutput`, one repair attempt
  on schema-validation failure, plus a code-level fabrication guard (`src/lib/ai/fact-guard.ts`)
  that rejects any AI output introducing a statistic or named entity not present in the source resume
- **PDF**: `@react-pdf/renderer`, rendered server-side from the same structured content + style JSON
  the browser preview uses — real selectable text, not a screenshot
- **Validation**: Zod for all request bodies, file uploads, and AI structured output

### Content vs. style

Resume **content** (facts: employers, dates, bullets, skills…) and **style** (page size, fonts,
spacing, section order…) are stored and validated separately. The AI can only select from a closed
set of style fields (`src/lib/schemas/resume-style.ts`) — it can never emit arbitrary CSS, HTML, or
components. See `src/lib/ai/prompts/` for the exact system prompts.

### Data model

```
User 1─* Resume 1─* ResumeVersion *─* CustomPrompt   (via VersionPrompt: order, isActive)
                        │
                        └─* GenerationRun  (operation, model, status, token usage, sanitized error)
```

- Deleting a `Resume` cascades to its versions, prompt assignments, and generation history.
- Deleting a `ResumeVersion` never deletes the underlying `Resume` or any `CustomPrompt`.
- **Reset** restores a version's `contentJson`/`styleJson` from its immutable `baseContentJson`/
  `baseStyleJson` snapshot (the original AI-formatted output for *that* version) and deactivates
  (not deletes) its active `VersionPrompt` links.
- **Undo** restores the single most recent pre-change snapshot, stored on the version itself
  (`previousContentJson`/`previousStyleJson`/`previousRevision`).
- Every AI operation writes a `GenerationRun` row *before* mutating anything; a failed AI call or a
  failed fabrication check never touches the stored content.

## Requirements

- Node.js 20+
- A PostgreSQL database (local, [Vercel Postgres/Neon](https://vercel.com/storage/postgres), etc.)
- An [Auth0](https://auth0.com) tenant + Regular Web Application
- An OpenAI API key
- A [Vercel Blob](https://vercel.com/storage/blob) store (for private file storage)

## Environment variables

Copy `.env.example` to `.env` and fill in real values — see that file for the full list
(`DATABASE_URL`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`,
`APP_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`).
Never commit `.env`.

### Auth0 setup

1. Create a **Regular Web Application** in your Auth0 dashboard.
2. Allowed Callback URLs: `http://localhost:3000/auth/callback` (add your production URL too, e.g.
   `https://your-app.vercel.app/auth/callback`).
3. Allowed Logout URLs: `http://localhost:3000` (and your production URL).
4. Copy the Domain, Client ID, and Client Secret into `.env`.
5. Generate `AUTH0_SECRET` with `openssl rand -hex 32`.

## Local development

```bash
npm install                 # install dependencies (also runs `prisma generate` via postinstall)
cp .env.example .env        # fill in real values
npx prisma migrate dev      # create the database schema (creates prisma/migrations on first run)
npm run dev                 # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start the production server (after `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create/apply a migration locally (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Apply pending migrations in production (`prisma migrate deploy`) |
| `npm run db:studio` | Open Prisma Studio |

## Testing

`npm run test` runs the Vitest suite (136 tests across 27 files): file validation (type sniffing,
size limits, extension/content mismatch), text normalization, structured AI-output validation,
style-patch validation (closed vocabulary, range checks, `sectionOrder` permutation), reset
behavior, the fabrication guard, the structured-output repair/retry path, cross-user ownership
isolation (`requireOwnedResume`/`requireOwnedVersion`/`requireOwnedPrompt`), the gallery
prompt-copy route (independent copy, duplicate-copy idempotency, self-copy rejection), the
direct-to-Blob upload flow (cross-user pathname rejection, idempotent finalize replay,
concurrent-finalize race resolution, content-mismatch cleanup), the atomic generation-rate-limit
reservation (lock ordering, bounded retry, no spurious rejection on a transient miss), the
orphaned-upload cleanup cron (auth gate, age-threshold filtering, partial-failure reporting), the
e2e webServer identity check (`src/lib/dev/assert-expected-server.ts`), and the full resume
checklist (mechanical checks, AI-judged checks mocked at the module boundary, and the
real-upload-pipeline fixtures — see "Resume checklist" below). All external services (Prisma, the
AI model) are mocked at the module boundary — no live database or API key is needed to run this
suite.

`npm run test:e2e` (Playwright, 44 tests) covers what's verifiable without live Auth0/Postgres/
OpenAI credentials: the landing page renders for signed-out visitors, every protected page/API
route correctly redirects to/rejects with Auth0 login when signed out, real-Chromium layout
regression checks (right-edge clipping, print isolation) against all 32 synthetic fixtures, and
automated `axe-core` accessibility checks (zero violations) against every page reachable without
authentication. Run `npx playwright install` once before the first run. A full authenticated
upload → format → customize → PDF walkthrough requires a configured environment (see above) and
is best verified manually against it.

`RUN_AI_EVALS=true npm run test:ai-evals` runs a separate, opt-in live-model harness (6 fixtures
against the real OpenAI extraction prompt) — costs real API tokens, so it never runs in CI or on
a normal `npm test`. Requires a funded `OPENAI_API_KEY`. As of this writing the connected OpenAI
account has zero credits (a live call returns `429 You have no credits remaining`), so this
harness cannot currently be run for real against production — see "Known limitations" below.

### Resume checklist

Every version can be run through a 31-item formatting/content checklist across 10 categories
(grammar, typos, formatting, margins, fonts, dates, page count, hallucinations, missing facts,
PDF safety — see `src/lib/checklist/definitions.ts` for the full, stable-ID list). 24 items are
**mechanical** (pure functions over the real rendered PDF, no API key needed — see
`src/lib/checklist/mechanical-checks.ts`, tested against the same 32-fixture battery plus 11 real
PDF/DOCX file fixtures in `src/fixtures/source-file-fixtures.ts`, exercised through the real
upload/extraction pipeline — `validateUploadedFile`/`extractResumeText` — including single-error,
multi-error, and two file-safety-rejection fixtures); 7 subjective items (grammar quality, tense,
spelling, punctuation, dropped facts) are **AI-judged** via one batched call, mocked in `npm test`
and only run for real via `RUN_AI_EVALS=true npm run test:checklist-evals` (uses
`SOURCE_TEXT_FIXTURES`; blocked by the zero-credits state noted above until the account is
funded). The editor's "Run resume check" panel shows every item's live pending → checking →
passed/warning/failed state, grouped by category.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: install, Prisma
generate, lint, typecheck, the Vitest suite, the Playwright suite, and a production build — all
with placeholder env values, since none of these steps make a live OpenAI/Auth0/Postgres/Blob
call. Superseded runs on the same branch are cancelled automatically.

`.github/workflows/ai-evals.yml` is separate and **manually dispatched only** (`workflow_dispatch`)
— it spends real OpenAI credits running the live eval harness above and is never a required check.
It reads `OPENAI_API_KEY`/`OPENAI_MODEL` from GitHub Actions Secrets, never from the workflow file.

## Deploying to Vercel

1. `vercel link` (or import the repo in the Vercel dashboard).
2. Provision a Postgres database (Vercel Postgres/Neon via Storage tab, or `vercel storage create`)
   and a Blob store, then `vercel env pull` to sync `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`
   locally, or set them directly in the Vercel dashboard.
3. Set the remaining env vars in the Vercel dashboard (Production + Preview):
   `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`
   (your `https://…vercel.app` or custom domain), `OPENAI_API_KEY`, `OPENAI_MODEL`, and
   `CRON_SECRET` (any random string — protects the nightly cleanup cron; see Scheduled cleanup
   below).
4. Add the production callback/logout URLs to your Auth0 application (see Auth0 setup above).
5. Apply migrations against the production database: `npx prisma migrate deploy` (with
   `DATABASE_URL` pointed at production — run this from CI/CD or locally before/after the first
   deploy; Vercel's build step does not run migrations automatically).
6. `vercel deploy --prod` (or push to your connected Git branch).

## How the formatting pipeline works

1. **Upload** — the browser uploads the file directly to Blob storage (`POST /api/resumes/upload/authorize`
   issues a short-lived, size/type-constrained client token; the file never passes through this
   app's own server, since every Vercel Function caps request bodies at 4.5 MB regardless of
   plan). `POST /api/resumes/finalize` then re-validates the now-stored bytes by real content
   sniffing (not just the declared MIME type — client-supplied type/size are never trusted), extracts
   text (`pdf-parse` / `mammoth` / UTF-8), hashes it (SHA-256, for duplicate detection), and is
   idempotent against retries (`Resume.storageKey` is unique; a repeat finalize for the same
   object returns the original result instead of reprocessing).
2. **Extraction** (`src/lib/ai/extraction.ts`): the raw text is sent to the model with a system
   prompt (`src/lib/ai/prompts/extraction.ts`) that treats it as untrusted data — any
   prompt-injection attempt inside the resume text is to be ignored, not followed — and asks for
   structured output matching `resumeContentInputSchema`. The model may never invent facts.
3. The validated result becomes the version's `contentJson` *and* `baseContentJson`, paired with
   the default `styleJson`.
4. **Customize** (`POST /api/versions/[id]/customize`): a natural-language instruction goes to a
   second agent (`src/lib/ai/prompts/customize.ts`) that returns either a style patch, a content
   edit, both, or a structured rejection. Content edits pass through the fabrication guard before
   being saved.
5. **Tailor** (`POST /api/resumes/[id]/versions` with a job description): a third agent
   (`src/lib/ai/prompts/tailor.ts`) reorders/emphasizes truthful existing content based on the job
   description, which is treated as prioritization context only, never a source of new facts.
6. **PDF** (`GET /api/versions/[id]/pdf`): the same `contentJson`/`styleJson` is rendered
   server-side with `@react-pdf/renderer` — deterministic, selectable text, ownership-checked
   before any data is read.

## Scheduled cleanup

If a browser tab is closed between a successful direct-to-Blob upload and the `finalize` call,
the uploaded object is orphaned — inert (never linked to a `Resume` row, never visible to any
user, blocked from reprocessing by ownership checks) but still consuming storage. A Vercel Cron
Job (`vercel.json`, `GET /api/cron/cleanup-orphaned-uploads`, nightly) sweeps the resume-uploads
prefix and deletes anything with no matching `Resume.storageKey` that's older than 24 hours (a
generous margin past any legitimate upload-to-finalize gap, so nothing mid-flight is ever
touched). The route checks `Authorization: Bearer $CRON_SECRET` — set `CRON_SECRET` in the
Vercel dashboard (Production, Preview, and Development) for both the cron trigger and local
testing.

## Known limitations

- The editor's "Apply" always commits a new revision (protected by Undo/Reset) rather than offering
  a separate non-committing preview step.
- The checklist's visual "checking" progression is a staged reveal of the real, already-computed
  server result (not a token-by-token live stream) — chosen for reliability on Vercel's serverless
  functions over a fragile per-item SSE stream for a single batched AI call. See
  `src/components/editor/checklist-panel.tsx`.
- `FONT-001`/`FONT-002`/`MARG-001`/`FMT-003`/`FMT-006` are construction-guarantee regression
  checks (the renderer can only ever emit one declared font/margin/section-order, by design) —
  they prove the guarantee still holds rather than detecting per-resume variation.
- The connected OpenAI account currently has zero credits (confirmed via a live call returning
  `429 You have no credits remaining`), which blocks both `test:ai-evals` and the new
  `test:checklist-evals` from running for real right now. This has happened before (see
  `docs/resume-formatting-audit.md`, ISSUE-10) and was resolved by funding the account — no code
  change is needed, only a billing action by the account owner.
- `src/lib/pdf/inspect.ts` no longer resolves `pdfjs-dist`'s worker/font paths via
  `require.resolve` (incompatible with Turbopack production builds); paths are derived via
  `path.join(process.cwd(), "node_modules", "pdfjs-dist", ...)` instead. `next.config.ts` also
  carries an `outputFileTracingIncludes` entry for those same pdfjs-dist files on the checklist
  route, as defense-in-depth for Vercel's deployed function bundle. Keep both in mind if you touch
  PDF inspection or pdfjs-dist upgrades.
