import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const [
    resumeCount,
    versionCount,
    bulletCount,
    experienceCount,
    projectCount,
    skillCount,
    applicationCount,
    scoreReports,
    matchReports,
    exports,
    timeline,
    applications,
  ] = await Promise.all([
    prisma.resume.count(),
    prisma.resumeVersion.count(),
    prisma.bullet.count(),
    prisma.experience.count(),
    prisma.project.count(),
    prisma.skill.count(),
    prisma.application.count(),
    prisma.scoreReport.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.matchReport.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.exportHistory.count(),
    prisma.timelineEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.application.findMany({ include: { resumeVersion: true } }),
  ]);

  const atsScores = scoreReports.filter((s) => s.type === "ats").map((s) => s.totalScore);
  const matchScores = matchReports.map((m) => m.overallScore);
  const versionScores = await prisma.resumeVersion.findMany({
    select: { atsScore: true, jobMatchScore: true, targetRole: true },
  });

  const avgResumeScore = atsScores.length
    ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length)
    : versionScores.length
      ? Math.round(versionScores.reduce((s, v) => s + v.atsScore, 0) / versionScores.length)
      : 0;

  const bestResumeScore = atsScores.length
    ? Math.max(...atsScores)
    : Math.max(0, ...versionScores.map((v) => v.atsScore));

  const avgJobMatch = matchScores.length
    ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
    : versionScores.length
      ? Math.round(versionScores.reduce((s, v) => s + v.jobMatchScore, 0) / versionScores.length)
      : 0;

  const roleCounts: Record<string, number> = {};
  versionScores.forEach((v) => {
    if (v.targetRole) roleCounts[v.targetRole] = (roleCounts[v.targetRole] ?? 0) + 1;
  });
  const strongestRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const interviews = applications.filter((a) =>
    ["interview", "final-round", "offer", "accepted"].includes(a.status)
  ).length;
  const offers = applications.filter((a) => ["offer", "accepted"].includes(a.status)).length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const appsThisMonth = applications.filter(
    (a) => a.dateApplied && new Date(a.dateApplied) >= thisMonth
  ).length;

  return {
    resumeCount,
    versionCount,
    bulletCount,
    experienceCount,
    projectCount,
    skillCount,
    applicationCount,
    avgResumeScore,
    bestResumeScore,
    avgJobMatch,
    strongestRole,
    weakestSection: "Metrics in bullets",
    appsThisMonth,
    interviews,
    offers,
    exports,
    timeline,
    applications,
    versionScores,
    matchReports,
    scoreReports,
  };
}
