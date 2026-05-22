import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarStoriesClient } from "@/components/star-stories/star-stories-client";

export default function StarStoriesPageRoute() {
  return (
    <>
      <Header title="STAR Stories" breadcrumbs={[{ label: "Home", href: "/" }, { label: "STAR Stories" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview-ready evidence bank</CardTitle>
          </CardHeader>
          <CardContent>
            <StarStoriesClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
