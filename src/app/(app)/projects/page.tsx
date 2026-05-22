import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectsClient } from "@/components/projects/projects-client";

export default function ProjectsPage() {
  return (
    <>
      <Header title="Projects" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Projects" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Project proof readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
