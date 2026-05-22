import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { AtsScannerClient } from "@/components/ats/ats-scanner-client";

export default async function AtsScannerPage() {
  const [versions, jobs] = await Promise.all([
    prisma.resumeVersion.findMany({
      select: { id: true, versionName: true, resume: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    prisma.jobDescription.findMany({
      select: { id: true, title: true, company: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
  ]);

  return (
    <>
      <Header title="ATS Scanner" breadcrumbs={[{ label: "Home", href: "/" }, { label: "ATS Scanner" }]} />
      <div className="p-6">
        <AtsScannerClient versions={versions} jobs={jobs} />
      </div>
    </>
  );
}
