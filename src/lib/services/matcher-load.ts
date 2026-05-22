import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import type { MatcherInput } from "@/lib/engines/job-matcher";

/**
 * Loads profile-shaped resume snapshot for matchers / tailoring.
 * If versionId provided, prefers selectedBullets/skills/etc. else full profile subsets.
 */
export async function loadMatcherResume(profileId: string, versionId?: string | null) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    include: {
      bullets: true,
      skills: true,
      projects: true,
      experiences: true,
      educations: true,
    },
  });
  if (!profile) return null;

  let bulletIds: string[] | null = null;
  let skillIds: string[] | null = null;
  let projectIds: string[] | null = null;
  let expIds: string[] | null = null;

  if (versionId) {
    const v = await prisma.resumeVersion.findUnique({ where: { id: versionId } });
    if (v?.resumeId) {
      const resume = await prisma.resume.findFirst({ where: { id: v.resumeId, profileId } });
      if (resume) {
        bulletIds = parseJson<string[]>(v.selectedBullets, []);
        skillIds = parseJson<string[]>(v.selectedSkills, []);
        projectIds = parseJson<string[]>(v.selectedProjects, []);
        expIds = parseJson<string[]>(v.selectedExperiences, []);
      }
    }
  }

  const bullets =
    bulletIds?.length ?? false
      ? profile.bullets.filter((b) => bulletIds!.includes(b.id))
      : profile.bullets;
  const skills =
    skillIds?.length ?? false
      ? profile.skills.filter((s) => skillIds!.includes(s.id))
      : profile.skills;
  const projects =
    projectIds?.length ?? false
      ? profile.projects.filter((p) => projectIds!.includes(p.id))
      : profile.projects;
  const experiences =
    expIds?.length ?? false
      ? profile.experiences.filter((e) => expIds!.includes(e.id))
      : profile.experiences;

  const sections: MatcherInput["resume"]["sections"] = [
    ...experiences.map((e) => ({ type: "experience", title: e.title, items: [{ id: e.id, content: e.organization }] })),
    ...projects.map((p) => ({ type: "project", title: p.name, items: [{ id: p.id, content: p.shortDescription ?? "" }] })),
  ];

  const plainText = [
    profile.fullName,
    profile.summary,
    ...bullets.map((b) => b.text),
    ...skills.map((s) => s.name),
  ]
    .filter(Boolean)
    .join("\n");

  const resume: MatcherInput["resume"] = {
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
    bullets,
    skills,
    projects,
    experiences,
    educations: profile.educations,
  };

  return resume;
}
