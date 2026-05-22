import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { TailorWizard } from "@/components/tailor/tailor-wizard";

export default async function TailorPage() {
  const [jobs, versions] = await Promise.all([
    prisma.jobDescription.findMany({
      select: { id: true, title: true, company: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.resumeVersion.findMany({
      select: { id: true, versionName: true, resume: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <>
      <Header title="Tailor resume" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tailor" }]} />
      <div className="p-6">
        <TailorWizard jobs={jobs} versions={versions} />
      </div>
    </>
  );
}
