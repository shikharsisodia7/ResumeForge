import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function TimelinePage() {
  const events = await prisma.timelineEvent.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <Header title="Timeline" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Timeline" }]} />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Full chronological stream</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((e) => (
              <div key={e.id} className="border-l-2 border-indigo-500 pl-4">
                <p className="text-sm font-semibold">{e.title}</p>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {e.type} · {formatDate(e.createdAt)}
                  {e.entityType ? ` · ${e.entityType}` : ""}
                </p>
                {e.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{e.description}</p>}
              </div>
            ))}
            {!events.length && <p className="text-sm text-zinc-500">No events yet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
