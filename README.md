# ResumeForge

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
`APP_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `BLOB_READ_WRITE_TOKEN`). Never commit `.env`.

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

`npm run test` runs the Vitest suite (56 tests): file validation (type sniffing, size limits,
extension/content mismatch), text normalization, structured AI-output validation, style-patch
validation (closed vocabulary, range checks, `sectionOrder` permutation), reset behavior, the
fabrication guard, the structured-output repair/retry path, cross-user ownership isolation
(`requireOwnedResume`/`requireOwnedVersion`/`requireOwnedPrompt`), and the gallery prompt-copy
route (independent copy, duplicate-copy idempotency, self-copy rejection). All external services
(Prisma, the AI model) are mocked at the module boundary — no live database or API key is needed
to run this suite.

`npm run test:e2e` (Playwright) covers what's verifiable without live Auth0/Postgres/OpenAI
credentials: the landing page renders for signed-out visitors, and every protected page/API route
correctly redirects to/rejects with Auth0 login when signed out. Run `npx playwright install`
once before the first run. A full authenticated upload → format → customize → PDF walkthrough
requires a configured environment (see above) and is best verified manually against it.

## Deploying to Vercel

1. `vercel link` (or import the repo in the Vercel dashboard).
2. Provision a Postgres database (Vercel Postgres/Neon via Storage tab, or `vercel storage create`)
   and a Blob store, then `vercel env pull` to sync `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`
   locally, or set them directly in the Vercel dashboard.
3. Set the remaining env vars in the Vercel dashboard (Production + Preview):
   `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`
   (your `https://…vercel.app` or custom domain), `OPENAI_API_KEY`, `OPENAI_MODEL`.
4. Add the production callback/logout URLs to your Auth0 application (see Auth0 setup above).
5. Apply migrations against the production database: `npx prisma migrate deploy` (with
   `DATABASE_URL` pointed at production — run this from CI/CD or locally before/after the first
   deploy; Vercel's build step does not run migrations automatically).
6. `vercel deploy --prod` (or push to your connected Git branch).

## How the formatting pipeline works

1. **Upload** (`POST /api/resumes/upload`): file is validated by real content sniffing (not just
   the declared MIME type), text is extracted (`pdf-parse` / `mammoth` / UTF-8), hashed (SHA-256,
   for duplicate detection), and stored as a private Blob object.
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

## Known limitations

- **Upload size on Vercel**: this repo's upload route accepts up to 10 MB as specified, but
  standard Vercel Serverless Functions cap request bodies below that for some plans. For reliably
  large files in production, switch to `@vercel/blob/client`'s direct-from-browser upload flow.
- The editor's "Apply" always commits a new revision (protected by Undo/Reset) rather than offering
  a separate non-committing preview step.
