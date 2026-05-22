import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.jobDescription.findUnique({
    where: { id },
    include: { keywords: { orderBy: { importance: "desc" } } },
  });
  if (!job) return notFound();

  const buckets = job.keywords.reduce<Record<string, typeof job.keywords>>((acc, k) => {
    acc[k.category] = acc[k.category] ?? [];
    acc[k.category]!.push(k);
    return acc;
  }, {});

  return (
    <>
      <Header
        title={job.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Job descriptions", href: "/job-descriptions" },
          { label: job.company },
        ]}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{job.company}</CardTitle>
            <p className="text-sm text-zinc-500">{job.location}</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="strong">{job.category}</Badge>
            <Link href="/matcher" className="text-indigo-600 hover:underline">
              Run matcher
            </Link>
            <Link href="/tailor" className="text-indigo-600 hover:underline">
              Tailoring wizard
            </Link>
          </CardContent>
        </Card>

        {Object.entries(buckets).map(([cat, kw]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle>{cat}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {kw.map((k) => (
                <Badge key={k.id} variant={k.isRequired ? "strong" : "default"} title={`${k.frequency}x mention`}>
                  {k.term} · {k.importance}
                  {k.isRequired ? "*" : ""}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Raw description</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-xs dark:bg-zinc-900">
              {job.descriptionText}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
