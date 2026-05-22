import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverLettersBuilder } from "@/components/cover-letters/cover-letters-builder";

export default function CoverLettersPage() {
  return (
    <>
      <Header title="Cover letters" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cover letters" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Template builder</CardTitle>
          </CardHeader>
          <CardContent>
            <CoverLettersBuilder />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
