import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillsClient } from "@/components/skills/skills-client";

export default function SkillsPage() {
  return (
    <>
      <Header title="Skills matrix" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Skills" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Evidence warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillsClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
