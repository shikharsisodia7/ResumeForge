import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportResumeTool } from "@/components/import/import-resume-tool";

export default function ImportPageRoute() {
  return (
    <>
      <Header title="Import resume" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Import" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk ingest from pasted text</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportResumeTool />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
