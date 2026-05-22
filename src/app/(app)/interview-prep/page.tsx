import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function InterviewPrepListPage() {
  const apps = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    include: { jobDescription: true, interviewPrep: true },
  });

  return (
    <>
      <Header title="Interview prep" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Interview prep" }]} />
      <div className="space-y-4 p-6">
        {apps.map((app) => (
          <Card key={app.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {app.company} — {app.role}
                </CardTitle>
                <p className="text-xs text-zinc-500">{app.jobDescription?.title ?? "No JD linked"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{app.status}</Badge>
                <Link href={`/interview-prep/${app.id}`} className="text-sm text-indigo-600 hover:underline">
                  Open prep workspace
                </Link>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
              {app.interviewPrep ? <p>Prep notes ready — refine talking points.</p> : <p>Prep not generated yet.</p>}
            </CardContent>
          </Card>
        ))}
        {!apps.length && <p className="text-sm text-zinc-500">No applications yet.</p>}
      </div>
    </>
  );
}
