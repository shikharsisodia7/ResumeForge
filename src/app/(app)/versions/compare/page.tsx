import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionCompareTool } from "@/components/versions/version-compare";

export default async function VersionComparePage() {
  const versions = await prisma.resumeVersion.findMany({
    select: { id: true, versionName: true, resume: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return (
    <>
      <Header title="Version compare" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]} />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Diff two plaintext exports</CardTitle>
          </CardHeader>
          <CardContent>{versions.length < 2 ? <p className="text-sm text-zinc-500">Need ≥2 resume versions seeded.</p> : <VersionCompareTool versions={versions} />}</CardContent>
        </Card>
      </div>
    </>
  );
}
