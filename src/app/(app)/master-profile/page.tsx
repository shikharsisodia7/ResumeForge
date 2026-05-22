import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getPrimaryProfile } from "@/lib/get-profile";
import Link from "next/link";
import { MasterProfileForm } from "@/components/master-profile/profile-form";

export default async function MasterProfilePage() {
  await getPrimaryProfile();
  const profile = await prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      educations: { orderBy: { order: "asc" } },
      customSections: { orderBy: { order: "asc" } },
    },
  });
  if (!profile) throw new Error("Profile missing");

  return (
    <>
      <Header
        title="Master profile"
        breadcrumbs={[{ label: "ResumeTailor Pro", href: "/" }, { label: "Master profile" }]}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Proof-backed source of truth</CardTitle>
              <p className="text-sm text-zinc-500">Everything downstream pulls from here.</p>
            </div>
            <Link href="/bullets">
              <Button variant="outline" size="sm">
                Manage bullets
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
            Keep contact info truthful, summaries tight, and custom sections purposeful. Sections link stays below the form for
            rapid edits.
          </CardContent>
        </Card>
        <MasterProfileForm initial={profile} />
      </div>
    </>
  );
}
