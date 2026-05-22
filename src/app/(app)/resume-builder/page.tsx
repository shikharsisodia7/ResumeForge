import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { ResumeBuilderClient } from "@/components/resume-builder/builder";
import { Card, CardContent } from "@/components/ui/card";

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{ version?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  let versionId = sp.version;
  if (!versionId) {
    const v = await prisma.resumeVersion.findFirst({ orderBy: { updatedAt: "desc" } });
    versionId = v?.id;
  }

  return (
    <>
      <Header title="Resume builder" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resume Builder" }]} />
      <div className="space-y-4 p-6">
        {!versionId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zinc-500">
              Seed the database (`npm run db:seed`) or create a resume + version before opening the builder.
            </CardContent>
          </Card>
        ) : (
          <ResumeBuilderClient versionId={versionId} />
        )}
      </div>
    </>
  );
}
