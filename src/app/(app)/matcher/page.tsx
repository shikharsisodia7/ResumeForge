import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { MatcherClient } from "@/components/matcher/matcher-client";

export default async function MatcherPage() {
  const [versions, jobs] = await Promise.all([
    prisma.resumeVersion.findMany({
      select: { id: true, versionName: true, resume: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.jobDescription.findMany({ select: { id: true, title: true, company: true }, orderBy: { updatedAt: "desc" }, take: 80 }),
  ]);

  return (
    <>
      <Header title="Job matcher" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Matcher" }]} />
      <div className="p-6">
        <MatcherClient versions={versions} jobs={jobs} />
      </div>
    </>
  );
}
