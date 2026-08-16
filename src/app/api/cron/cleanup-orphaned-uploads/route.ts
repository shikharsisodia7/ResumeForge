import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteStorageObject, listResumeSourceObjects } from "@/lib/storage/blob";

/**
 * A blob PUT directly to storage that never gets a matching `finalize` call
 * (tab closed mid-upload, network drop, abandoned flow) is inert — it's
 * never linked to a `Resume` row, so no user can ever see or reprocess it —
 * but it does sit there consuming storage forever otherwise. This sweeps
 * the resume-uploads prefix nightly (see vercel.json) and deletes anything
 * with no matching `Resume.storageKey` that's older than the safety margin
 * below, which is generously longer than any legitimate upload-to-finalize
 * gap should ever take.
 */
const ORPHAN_AGE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [objects, resumes] = await Promise.all([
    listResumeSourceObjects(),
    prisma.resume.findMany({ select: { storageKey: true } }),
  ]);
  const knownStorageKeys = new Set(resumes.map((r) => r.storageKey));

  const cutoff = Date.now() - ORPHAN_AGE_THRESHOLD_MS;
  const orphaned = objects.filter(
    (object) => !knownStorageKeys.has(object.pathname) && object.uploadedAt.getTime() < cutoff,
  );

  const results = await Promise.allSettled(orphaned.map((object) => deleteStorageObject(object.pathname)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - deleted;
  if (failed > 0) {
    console.error(`[cleanup-orphaned-uploads] failed to delete ${failed} of ${orphaned.length} orphaned objects`);
  }

  return NextResponse.json({
    scanned: objects.length,
    orphaned: orphaned.length,
    deleted,
    failed,
  });
}
