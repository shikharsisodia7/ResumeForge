import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InterviewPrepActions } from "@/components/interview-prep/prep-actions";

export default async function InterviewPrepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      jobDescription: { include: { keywords: true } },
      interviewPrep: true,
    },
  });
  if (!application) return notFound();

  const topKeywords = application.jobDescription?.keywords?.slice(0, 12) ?? [];

  return (
    <>
      <Header
        title={`Prep · ${application.company}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Interview prep", href: "/interview-prep" },
          { label: application.role },
        ]}
      />
      <div className="space-y-6 p-6">
        <InterviewPrepActions applicationId={application.id} />
        <Card>
          <CardHeader>
            <CardTitle>Keyword spotlight</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topKeywords.map((k) => (
              <Badge key={k.id} variant="strong">
                {k.term}
              </Badge>
            ))}
            {!topKeywords.length && <p className="text-sm text-zinc-500">Link this application to a job description.</p>}
          </CardContent>
        </Card>
        {application.interviewPrep && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Likely topics</CardTitle>
              </CardHeader>
              <CardContent>{application.interviewPrep.likelyTopics}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stories to emphasize</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{application.interviewPrep.projectsToDiscuss}</p>
                <p className="mt-3 text-sm">{application.interviewPrep.experiencesToDiscuss}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
