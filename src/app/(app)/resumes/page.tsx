import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ResumesPage() {
  const resumes = await prisma.resume.findMany({
    orderBy: { updatedAt: "desc" },
    include: { versions: { orderBy: { updatedAt: "desc" } } },
  });

  return (
    <>
      <Header title="Resumes" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resumes" }]} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Libraries & versions</CardTitle>
            <Link href="/resume-builder">
              <Button size="sm">Open resume builder</Button>
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-3">Resume</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Versions</th>
                  <th className="pb-3">Scores</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {resumes.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-zinc-500">Template · {r.template}</p>
                    </td>
                    <td className="py-3">
                      {[r.targetRole, r.targetCompany].filter(Boolean).join(" @ ") || "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.versions.slice(0, 4).map((v) => (
                          <Badge key={v.id} variant="default">
                            {v.versionName}
                          </Badge>
                        ))}
                        {r.versions.length > 4 && <Badge variant="warning">+{r.versions.length - 4}</Badge>}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="text-xs">
                        ATS {r.versions[0]?.atsScore ?? "—"} · Match {r.versions[0]?.jobMatchScore ?? "—"}
                      </div>
                    </td>
                    <td className="py-3">
                      {r.versions[0]?.id ? (
                        <Link className="text-indigo-600 hover:underline" href={`/resume-builder?version=${r.versions[0].id}`}>
                          Builder
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
