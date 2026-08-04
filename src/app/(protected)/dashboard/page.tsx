import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireUser();

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      originalFilename: true,
      createdAt: true,
      isProcessing: true,
      versions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          targetCompany: true,
          targetRole: true,
          parentVersionId: true,
          revision: true,
          isProcessing: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a resume, then create tailored versions for each job you&apos;re applying to.
          </p>
        </div>
      </div>
      <DashboardClient
        initialResumes={resumes.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          versions: r.versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
        }))}
      />
    </div>
  );
}
