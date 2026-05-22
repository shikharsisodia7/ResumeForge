import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const exportedAt = new Date().toISOString();
    const [
      timelineEvents,
      fileAssets,
      settingsRow,
      jobDescriptions,
      coverLetters,
      applications,
      userProfiles,
    ] = await Promise.all([
      prisma.timelineEvent.findMany(),
      prisma.fileAsset.findMany(),
      prisma.settings.findUnique({ where: { id: "default" } }),
      prisma.jobDescription.findMany({ include: { keywords: true } }),
      prisma.coverLetter.findMany(),
      prisma.application.findMany(),
      prisma.userProfile.findMany({
        include: {
          customSections: true,
          educations: true,
          experiences: true,
          projects: true,
          skills: true,
          bullets: true,
          resumes: {
            include: {
              sections: true,
              versions: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      exportedAt,
      timelineEvents,
      fileAssets,
      settings: settingsRow,
      jobDescriptions,
      coverLetters,
      applications,
      profiles: userProfiles,
    });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Export failed", 500);
  }
}

type JsonRow = Record<string, unknown>;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profiles?: JsonRow[];
      jobDescriptions?: JsonRow[];
      timelineEvents?: JsonRow[];
      settings?: JsonRow | null;
      coverLetters?: JsonRow[];
      fileAssets?: JsonRow[];
      applications?: JsonRow[];
    };

    if (!Array.isArray(body.profiles))
      return jsonErr("profiles array required (same shape as GET `/api/backup`)", 400);

    const profilesPayload = body.profiles;

    await prisma.$transaction(async (tx) => {
      await tx.interviewPrep.deleteMany();
      await tx.starStory.deleteMany();
      await tx.application.deleteMany();
      await tx.matchReport.deleteMany();
      await tx.scoreReport.deleteMany();
      await tx.exportHistory.deleteMany();
      await tx.resumeVersion.deleteMany();
      await tx.resumeSection.deleteMany();
      await tx.coverLetter.deleteMany();
      await tx.jobKeyword.deleteMany();
      await tx.jobDescription.deleteMany();
      await tx.timelineEvent.deleteMany();
      await tx.fileAsset.deleteMany();
      await tx.award.deleteMany();
      await tx.certification.deleteMany();
      await tx.leadership.deleteMany();
      await tx.userProfile.deleteMany();

      if (Array.isArray(body.jobDescriptions))
        for (const j of body.jobDescriptions) {
          const keywords = Array.isArray((j as JsonRow).keywords)
            ? ((j as JsonRow).keywords as JsonRow[])
            : [];
          await tx.jobDescription.create({
            data: {
              ...(omitKeys(j as JsonRow, ["keywords", "id", "createdAt", "updatedAt"]) as unknown as Omit<
                Prisma.JobDescriptionCreateInput,
                "keywords"
              >),
              keywords:
                keywords.length > 0
                  ? {
                      create: keywords.map((raw) => sanitizeKeyword(raw)),
                    }
                  : undefined,
            },
          });
        }

      for (const raw of profilesPayload) {
        const {
          id: _p,
          createdAt: __p,
          updatedAt: ___p,
          customSections,
          educations,
          experiences,
          projects,
          skills,
          bullets,
          resumes,
          ...profileScalars
        } = raw;

        await tx.userProfile.create({
          data: {
            ...omitKeys(profileScalars, ["createdAt", "updatedAt"]),
            customSections:
              typeof customSections === "object" && Array.isArray(customSections)
                ? { create: customSections.map((c) => pickSection(c)) }
                : undefined,
            educations:
              typeof educations === "object" && Array.isArray(educations)
                ? { create: educations.map((c) => pickEducation(c)) }
                : undefined,
            experiences:
              typeof experiences === "object" && Array.isArray(experiences)
                ? { create: experiences.map((c) => pickExperience(c)) }
                : undefined,
            projects:
              typeof projects === "object" && Array.isArray(projects)
                ? { create: projects.map((c) => pickProject(c)) }
                : undefined,
            skills:
              typeof skills === "object" && Array.isArray(skills)
                ? { create: skills.map((c) => pickSkill(c)) }
                : undefined,
            bullets:
              typeof bullets === "object" && Array.isArray(bullets)
                ? { create: bullets.map((c) => pickBullet(c)) }
                : undefined,
            resumes:
              typeof resumes === "object" && Array.isArray(resumes)
                ? {
                    create: resumes.map((r) => ({
                      ...pickResume(r),
                      sections:
                        Array.isArray(r.sections as unknown[])
                          ? {
                              create: (r.sections as JsonRow[]).map((s) => pickResumeSection(s)),
                            }
                          : undefined,
                      versions:
                        Array.isArray(r.versions as unknown[])
                          ? {
                              create: (r.versions as JsonRow[]).map((v) =>
                                pickResumeVersion(v)
                              ),
                            }
                          : undefined,
                    })),
                  }
                : undefined,
          } as Parameters<typeof tx.userProfile.create>[0]["data"],
        });
      }

      if (Array.isArray(body.timelineEvents))
        await tx.timelineEvent.createMany({
          data: body.timelineEvents.map((t) => omitKeys(t, ["id"])) as never[],
        });

      if (body.settings && typeof body.settings === "object" && body.settings !== null) {
        const cleared = omitKeys(body.settings as JsonRow, ["updatedAt", "id"]);
        await tx.settings.upsert({
          where: { id: "default" },
          create: Object.assign({}, cleared, { id: "default" }) as Parameters<
            typeof tx.settings.upsert
          >[0]["create"],
          update: omitKeys(body.settings as JsonRow, ["id"]) as Parameters<
            typeof tx.settings.upsert
          >[0]["update"],
        });
      }

      if (Array.isArray(body.coverLetters))
        await tx.coverLetter.createMany({
          data: body.coverLetters.map((c) =>
            omitKeys(c, ["id", "jobDescriptionId", "resumeVersionId"])
          ) as never[],
        });

      if (Array.isArray(body.fileAssets))
        await tx.fileAsset.createMany({ data: body.fileAssets.map((f) => omitKeys(f, ["id"])) as never[] });

      if (Array.isArray(body.applications))
        await tx.application.createMany({
          data: body.applications.map((a) =>
            omitKeys(a, ["id", "resumeVersionId", "jobDescriptionId", "coverLetterId"])
          ) as never[],
        });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Import failed", 500);
  }
}

function omitKeys<T extends Record<string, unknown>>(row: T, keys: readonly string[]): Record<string, unknown> {
  const out = { ...row };
  for (const k of keys) delete out[k];
  return out;
}

function pickSection(row: JsonRow) {
  return omitKeys(row, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickEducation(row: JsonRow) {
  return omitKeys(row, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickExperience(row: JsonRow) {
  return omitKeys(row, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickProject(row: JsonRow) {
  return omitKeys(row, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickSkill(row: JsonRow) {
  return omitKeys(row, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickBullet(row: JsonRow) {
  return omitKeys(row, [
    "id",
    "profileId",
    "experienceId",
    "projectId",
    "createdAt",
    "updatedAt",
  ]);
}
function pickResume(row: JsonRow) {
  const { sections: _s, versions: _v, ...rest } = row;
  return omitKeys(rest, ["id", "profileId", "createdAt", "updatedAt"]);
}
function pickResumeSection(row: JsonRow) {
  return omitKeys(row, ["id", "resumeId", "createdAt", "updatedAt"]);
}
function pickResumeVersion(row: JsonRow) {
  void row.resumeId;
  return omitKeys(row, ["id", "resumeId", "jobDescriptionId", "parentVersionId", "createdAt", "updatedAt"]);
}

function sanitizeKeyword(raw: JsonRow): Prisma.JobKeywordCreateWithoutJobDescriptionInput {
  const term =
    raw.term !== undefined && raw.term !== null ? String(raw.term) : "(unknown)";
  const category =
    raw.category !== undefined && raw.category !== null ? String(raw.category) : "general";
  return {
    term,
    category,
    importance:
      typeof raw.importance === "number"
        ? raw.importance
        : raw.importance != null
          ? Number(raw.importance) || 50
          : 50,
    frequency:
      typeof raw.frequency === "number"
        ? raw.frequency
        : raw.frequency != null
          ? Number(raw.frequency) || 1
          : 1,
    isRequired: raw.isRequired === true || raw.isRequired === "true",
  };
}
