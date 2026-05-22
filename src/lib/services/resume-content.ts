import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import type { ResumeContent } from "@/lib/types";
import type { Bullet, Education, Experience, Project, Resume, ResumeSection, Skill, UserProfile, ResumeVersion } from "@prisma/client";

/** Selections + hydrated entities for one resume version (used by export and matching routes). */
export type ResumeVersionBundle = {
  version: ResumeVersion & {
    resume: Resume & {
      profile: UserProfile;
      sections: ResumeSection[];
    };
  };
  profile: UserProfile;
  bullets: Bullet[];
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  educations: Education[];
};

export async function gatherResumeVersionBundle(versionId: string): Promise<ResumeVersionBundle | null> {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: versionId },
    include: {
      resume: {
        include: {
          profile: true,
          sections: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!version?.resume?.profile) return null;

  const profile = version.resume.profile;
  const bulletIds = parseJson<string[]>(version.selectedBullets, []);
  const skillIds = parseJson<string[]>(version.selectedSkills, []);
  const projectIds = parseJson<string[]>(version.selectedProjects, []);
  const expIds = parseJson<string[]>(version.selectedExperiences, []);

  const [bullets, skills, projects, experiences, educations] = await Promise.all([
    bulletIds.length
      ? prisma.bullet.findMany({ where: { id: { in: bulletIds } } })
      : prisma.bullet.findMany({ where: { profileId: profile.id }, take: 20 }),
    skillIds.length
      ? prisma.skill.findMany({ where: { id: { in: skillIds } } })
      : prisma.skill.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } }),
    projectIds.length
      ? prisma.project.findMany({ where: { id: { in: projectIds } } })
      : prisma.project.findMany({ where: { profileId: profile.id }, take: 6 }),
    expIds.length
      ? prisma.experience.findMany({ where: { id: { in: expIds } } })
      : prisma.experience.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } }),
    prisma.education.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } }),
  ]);

  return {
    version,
    profile,
    bullets,
    skills,
    projects,
    experiences,
    educations,
  };
}

export async function buildResumeContentFromVersion(versionId: string): Promise<ResumeContent | null> {
  const bundle = await gatherResumeVersionBundle(versionId);
  if (!bundle) return null;

  const { profile, bullets, skills, projects, experiences, educations } = bundle;

  const sections: ResumeContent["sections"] = [];

  if (profile.summary) {
    sections.push({
      type: "summary",
      title: "Summary",
      items: [{ id: "summary", content: profile.summary }],
    });
  }

  if (skills.length) {
    sections.push({
      type: "skills",
      title: "Skills",
      items: [{ id: "skills", content: skills.map((s) => s.name).join(" • ") }],
    });
  }

  if (experiences.length) {
    sections.push({
      type: "experience",
      title: "Experience",
      items: experiences.flatMap((e) => {
        const expBullets = bullets.filter((b) => b.experienceId === e.id);
        const header = `${e.title} | ${e.organization}${e.startDate ? ` | ${e.startDate}${e.endDate ? ` – ${e.endDate}` : ""}` : ""}`;
        if (expBullets.length) {
          return expBullets.map((b, i) => ({
            id: b.id,
            content: i === 0 ? header : "",
            subContent: `• ${b.text}`,
          }));
        }
        return [{ id: e.id, content: header, subContent: e.description ?? undefined }];
      }),
    });
  }

  if (projects.length) {
    sections.push({
      type: "projects",
      title: "Projects",
      items: projects.map((p) => ({
        id: p.id,
        content: p.name,
        subContent: [
          p.shortDescription,
          p.techStack ? `Tech: ${p.techStack}` : null,
          ...bullets.filter((b) => b.projectId === p.id).map((b) => `• ${b.text}`),
        ]
          .filter(Boolean)
          .join("\n"),
      })),
    });
  }

  if (educations.length) {
    sections.push({
      type: "education",
      title: "Education",
      items: educations.map((e) => ({
        id: e.id,
        content: `${e.school}${e.degree ? ` — ${e.degree}` : ""}${e.major ? `, ${e.major}` : ""}`,
        subContent: [e.gpa ? `GPA: ${e.gpa}` : null, e.graduationDate].filter(Boolean).join(" | ") || undefined,
      })),
    });
  }

  const plainText = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.summary,
    ...skills.map((s) => s.name),
    ...bullets.map((b) => b.text),
    ...projects.map((p) => `${p.name} ${p.shortDescription ?? ""}`),
    ...experiences.map((e) => `${e.title} ${e.organization}`),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedIn: profile.linkedIn,
      github: profile.github,
      portfolio: profile.portfolio,
      website: profile.website,
      summary: profile.summary,
    },
    sections,
    plainText,
    bulletTexts: bullets.map((b) => b.text),
    skillNames: skills.map((s) => s.name),
  };
}

export async function getMasterProfileData() {
  const profile = await prisma.userProfile.findFirst({
    include: {
      educations: { orderBy: { order: "asc" } },
      experiences: { orderBy: { order: "asc" }, include: { bullets: true } },
      projects: { orderBy: { order: "asc" }, include: { bullets: true } },
      skills: { orderBy: { order: "asc" } },
      bullets: { orderBy: { updatedAt: "desc" } },
      resumes: { include: { versions: true } },
    },
  });
  return profile;
}
