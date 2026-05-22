import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationsClient } from "@/components/applications/applications-client";

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <>
      <Header title="Applications" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Applications" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tracker & analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationsClient initial={applications} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
