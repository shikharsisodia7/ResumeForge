import { Header } from "@/components/layout/header";
import { BulletBuilderForm } from "@/components/bullet-builder/bullet-builder-form";

export default function BulletBuilderPage() {
  return (
    <>
      <Header title="Bullet builder" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bullet builder" }]} />
      <div className="p-6">
        <BulletBuilderForm />
      </div>
    </>
  );
}
