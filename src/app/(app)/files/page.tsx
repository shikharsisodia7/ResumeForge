import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileVaultClient } from "@/components/files/file-vault-client";

export default function FilesPage() {
  return (
    <>
      <Header title="File vault" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Files" }]} />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Reference artifacts</CardTitle>
          </CardHeader>
          <CardContent>
            <FileVaultClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
