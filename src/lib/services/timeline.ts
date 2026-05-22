import { prisma } from "@/lib/db";

export async function addTimelineEvent(
  type: string,
  title: string,
  description?: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.timelineEvent.create({
    data: {
      type,
      title,
      description,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}
