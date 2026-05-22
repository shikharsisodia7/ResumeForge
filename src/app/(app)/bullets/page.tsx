import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BulletsClient } from "@/components/bullets/bullets-client";

export default function BulletsPage() {
  return (
    <>
      <Header title="Bullet bank" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bullets" }]} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Filterable inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <BulletsClient />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
