import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics & dictionaries</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsPanel />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
