import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { JobPasteForm } from "@/components/job-descriptions/paste-form";

export default async function JobsPage() {
  const jobs = await prisma.jobDescription.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <>
      <Header title="Job descriptions" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Job descriptions" }]} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Paste a posting</CardTitle>
          </CardHeader>
          <CardContent>
            <JobPasteForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((j) => (
              <Link key={j.id} href={`/job-descriptions/${j.id}`} className="block rounded-lg border p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-sm text-zinc-500">{j.company}</p>
                  </div>
                  <Badge variant="partial">{j.category}</Badge>
                </div>
              </Link>
            ))}
            {!jobs.length && <p className="text-sm text-zinc-500">No postings yet — paste above.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
