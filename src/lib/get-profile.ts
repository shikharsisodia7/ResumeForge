import { prisma } from "@/lib/db";

/** Single-user workspace: first profile or a new empty shell. */
export async function getPrimaryProfile() {
  let profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: { fullName: "Your Name" },
    });
  }
  return profile;
}
