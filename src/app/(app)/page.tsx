import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/services/dashboard";
import { ScoreLineChart, StatusPieChart, RoleBarChart, SkillsCoverageChart } from "@/components/dashboard/charts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, List, Briefcase, TrendingUp, Target, Award, Send, Download,
} from "lucide-react";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Resumes", value: stats.resumeCount, icon: FileText },
    { label: "Versions", value: stats.versionCount, icon: FileText },
    { label: "Bullets", value: stats.bulletCount, icon: List },
    { label: "Experiences", value: stats.experienceCount, icon: Briefcase },
    { label: "Projects", value: stats.projectCount, icon: Target },
    { label: "Skills", value: stats.skillCount, icon: Award },
    { label: "Applications", value: stats.applicationCount, icon: Send },
    { label: "Avg Resume Score", value: stats.avgResumeScore, icon: TrendingUp, suffix: "/100" },
    { label: "Best Score", value: stats.bestResumeScore, icon: TrendingUp, suffix: "/100" },
    { label: "Avg Job Match", value: stats.avgJobMatch, icon: Target, suffix: "%" },
    { label: "Interviews", value: stats.interviews, icon: Send },
    { label: "Exports", value: stats.exports, icon: Download },
  ];

  const scoreHistory = stats.scoreReports
    .filter((s) => s.type === "ats")
    .slice(0, 8)
    .reverse()
    .map((s, i) => ({
      date: `W${i + 1}`,
      score: s.totalScore,
    }));

  const statusCounts: Record<string, number> = {};
  stats.applications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace(/-/g, " "),
    value,
  }));

  const roleData = Object.entries(
    stats.versionScores.reduce<Record<string, number>>((acc, v) => {
      if (v.targetRole) acc[v.targetRole] = (acc[v.targetRole] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([role, count]) => ({ role: role.slice(0, 12), count }));

  const skillsCoverage = [
    { category: "Programming", coverage: 85 },
    { category: "Frameworks", coverage: 78 },
    { category: "Databases", coverage: 72 },
    { category: "AI/ML", coverage: 65 },
    { category: "Leadership", coverage: 80 },
    { category: "Business", coverage: 55 },
  ];

  return (
    <>
      <Header title="Dashboard" breadcrumbs={[{ label: "Home" }]} />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="flex items-center justify-between pt-5">
                <div>
                  <p className="text-xs text-zinc-500">{c.label}</p>
                  <p className="text-2xl font-bold">
                    {c.value}
                    {c.suffix ?? ""}
                  </p>
                </div>
                <c.icon className="h-8 w-8 text-indigo-500 opacity-60" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Resume Score Over Time</CardTitle></CardHeader>
            <CardContent>
              <ScoreLineChart data={scoreHistory.length ? scoreHistory : [{ date: "Now", score: stats.avgResumeScore }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Application Status</CardTitle></CardHeader>
            <CardContent>
              <StatusPieChart data={statusData.length ? statusData : [{ name: "saved", value: 1 }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Resume Versions by Role</CardTitle></CardHeader>
            <CardContent>
              <RoleBarChart data={roleData.length ? roleData : [{ role: "SWE", count: 2 }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Skills Coverage by Category</CardTitle></CardHeader>
            <CardContent>
              <SkillsCoverageChart data={skillsCoverage} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Strongest target role</p>
                <p className="font-semibold">{stats.strongestRole}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Weakest section</p>
                <p className="font-semibold">{stats.weakestSection}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Applications this month</p>
                <p className="font-semibold">{stats.appsThisMonth}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Offers received</p>
                <p className="font-semibold">{stats.offers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {stats.timeline.map((e) => (
                  <li key={e.id} className="border-l-2 border-indigo-500 pl-3">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-zinc-500">{formatDate(e.createdAt)}</p>
                  </li>
                ))}
              </ul>
              <Link href="/timeline" className="mt-4 block text-sm text-indigo-600 hover:underline">
                View all activity →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/tailor" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Start Tailoring
          </Link>
          <Link href="/job-descriptions" className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Import Job Description
          </Link>
          <Link href="/matcher" className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Run Job Matcher
          </Link>
        </div>
      </div>
    </>
  );
}
