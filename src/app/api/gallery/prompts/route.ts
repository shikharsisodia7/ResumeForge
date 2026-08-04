import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { galleryQuerySchema } from "@/lib/schemas/requests";

export const GET = apiRoute(async (request) => {
  // Still requires a session — this is an in-app feature, not a public
  // internet-facing endpoint — but the data itself isn't user-specific, so
  // it can carry a short, shared cache lifetime instead of `no-store`.
  await requireUser();

  const { q, cursor, limit } = galleryQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  const prompts = await prisma.customPrompt.findMany({
    where: {
      isShared: true,
      ...(q
        ? {
            OR: [
              { text: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      text: true,
      description: true,
      createdAt: true,
      creator: { select: { displayName: true } },
    },
  });

  const hasMore = prompts.length > limit;
  const page = hasMore ? prompts.slice(0, limit) : prompts;

  const response = NextResponse.json({
    prompts: page.map((p) => ({
      id: p.id,
      text: p.text,
      description: p.description,
      createdAt: p.createdAt,
      creatorDisplayName: p.creator.displayName,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
  return response;
});
