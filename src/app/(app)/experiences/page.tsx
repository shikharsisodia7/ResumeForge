import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExperiencesClient } from "@/components/experiences/experiences-client";

export default function ExperiencesPage() {
  return (
    <>
      <Header title="Experiences" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Experiences" }]} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Evidence ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <ExperiencesClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
