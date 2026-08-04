import { FileText, Share2, Sparkles, Wand2 } from "lucide-react";
import { auth0 } from "@/lib/auth0";

export default async function LandingPage() {
  const session = await auth0.getSession();

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <FileText className="size-5 text-accent" aria-hidden="true" />
            ResumeForge
          </div>
          {session ? (
            <a
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Go to dashboard
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/auth/login"
                className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium hover:bg-muted"
              >
                Log in
              </a>
              <a
                href="/auth/login?screen_hint=signup"
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Sign up
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn any resume into a polished, tailored PDF
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Upload a resume, let an AI agent organize and format it, customize the layout with plain
          English, and produce a truthfully tailored version for every job you apply to.
        </p>
        <div className="mt-8">
          <a
            href={session ? "/upload" : "/auth/login?screen_hint=signup"}
            className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            {session ? "Upload a resume" : "Get started for free"}
          </a>
        </div>

        <div className="mx-auto mt-20 grid gap-6 text-left sm:grid-cols-3">
          <Feature
            icon={<Wand2 className="size-5" aria-hidden="true" />}
            title="AI formatting, real facts"
            description="Your resume is organized for readability and ATS compatibility — the AI never invents employers, dates, or skills."
          />
          <Feature
            icon={<Sparkles className="size-5" aria-hidden="true" />}
            title="Customize in plain English"
            description={'Say "make my name bigger" or "put projects first" — instructions become precise, validated formatting changes.'}
          />
          <Feature
            icon={<Share2 className="size-5" aria-hidden="true" />}
            title="Share what works"
            description="Save your favorite formatting instructions, or browse and copy prompts other users have shared."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent-muted text-accent">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
