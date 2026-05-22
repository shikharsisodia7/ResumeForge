import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const files = await prisma.fileAsset.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(files);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list files", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const fd = await request.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) return jsonErr("multipart field 'file' is required", 400);

    const original = file.name || "upload";
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(original);
    const base = `${Date.now()}_${path.basename(original, ext)}`.replace(/[^\w.-]+/g, "_");
    const destName = `${base}${ext}`;
    const filePath = path.join(uploadsDir, destName);
    await writeFile(filePath, buf);

    const category = (fd.get("category") as string) || "other";
    const tags = (fd.get("tags") as string) || undefined;
    const relatedResumeId = (fd.get("relatedResumeId") as string) || undefined;
    const relatedJobId = (fd.get("relatedJobId") as string) || undefined;
    const relatedApplicationId = (fd.get("relatedApplicationId") as string) || undefined;
    const relatedProjectId = (fd.get("relatedProjectId") as string) || undefined;
    const notes = (fd.get("notes") as string) || undefined;

    const row = await prisma.fileAsset.create({
      data: {
        fileName: original,
        filePath: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
        fileType: file.type || ext || "application/octet-stream",
        fileSize: buf.length,
        category,
        tags,
        relatedResumeId,
        relatedJobId,
        relatedApplicationId,
        relatedProjectId,
        notes,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to upload file", 500);
  }
}
