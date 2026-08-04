import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

export const GET = apiRoute(async () => {
  const user = await requireUser();

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      originalFilename: true,
      createdAt: true,
      updatedAt: true,
      isProcessing: true,
      _count: { select: { versions: true } },
    },
  });

  return NextResponse.json({ resumes });
});
