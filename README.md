# ResumeTailor Pro (ResumeForge)

**Local-first resume intelligence platform** — tailor resumes to jobs, score bullets, simulate ATS, and track applications. **No API keys. No cloud. No external AI.**

Built with Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, React Hook Form, Zod, and Recharts.

## Features

- Master profile, resume builder with live preview, 7 ATS-safe templates
- Job description analyzer, matcher, 12-step tailoring workflow
- Bullet bank & builder, ATS simulator, application tracker
- Cover letters, interview prep, STAR stories, file vault, import/export, backup

## Quick Start

```bash
git clone https://github.com/shikharsisodia7/ResumeForge.git
cd ResumeForge
npm install
cp .env.example .env
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sample demo data loads on first seed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run setup` | `db:push` + seed sample data |
| `npm run db:reset` | Reset database and re-seed |

## Privacy

- Database: `prisma/dev.db` (gitignored — your data stays local)
- Uploads: `uploads/` (gitignored)
- All analysis runs on your machine; paste job descriptions manually

## License

MIT
