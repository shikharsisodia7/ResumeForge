import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { GalleryClient } from "@/components/gallery/gallery-client";

const PAGE_SIZE = 20;

export default async function GalleryPage() {
  await requireUser();

  const prompts = await prisma.customPrompt.findMany({
    where: { isShared: true },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      text: true,
      description: true,
      createdAt: true,
      creator: { select: { displayName: true } },
    },
  });

  const hasMore = prompts.length > PAGE_SIZE;
  const page = hasMore ? prompts.slice(0, PAGE_SIZE) : prompts;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Prompt gallery</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Formatting instructions shared by other ResumeForge users. Copy one into your own library to use it.
      </p>
      <div className="mt-6">
        <GalleryClient
          initialPrompts={page.map((p) => ({
            id: p.id,
            text: p.text,
            description: p.description,
            createdAt: p.createdAt.toISOString(),
            creatorDisplayName: p.creator.displayName,
          }))}
          initialNextCursor={hasMore ? page[page.length - 1].id : null}
        />
      </div>
    </div>
  );
}
