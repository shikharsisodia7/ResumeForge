import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalSearchPanel } from "@/components/search/global-search";

export default function SearchPage() {
  return (
    <>
      <Header title="Global search" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Federated lookups</CardTitle>
          </CardHeader>
          <CardContent>
            <GlobalSearchPanel />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
