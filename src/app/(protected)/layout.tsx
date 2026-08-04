import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Header } from "@/components/layout/header";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  return (
    <div className="min-h-full">
      <Header user={{ displayName: user.displayName, email: user.email }} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
