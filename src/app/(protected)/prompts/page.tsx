import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PromptsClient } from "@/components/prompts/prompts-client";

export default async function PromptsPage() {
  const user = await requireUser();

  const prompts = await prisma.customPrompt.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Your prompt library</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Save formatting instructions to reuse across resumes, and share the ones that work well.
      </p>
      <div className="mt-6">
        <PromptsClient
          initialPrompts={prompts.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
