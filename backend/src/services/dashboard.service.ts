import { prisma } from "../lib/prisma";
import { ReportStatus, TaskType } from "../generated/prisma/client";

const TREND_WEEKS = 8;

/** The Monday of the week that `date` falls in, at UTC midnight. */
function mondayOf(date: Date): Date {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const weekday = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return result;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

function emptyStatusCounts(): Record<ReportStatus, number> {
  return { DRAFT: 0, SUBMITTED: 0, NEEDS_CORRECTION: 0, APPROVED: 0 };
}

export async function getDashboard(weekStartInput?: Date) {
  const weekStart = weekStartInput
    ? mondayOf(weekStartInput)
    : mondayOf(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const trendStart = addWeeks(weekStart, -(TREND_WEEKS - 1));

  const [
    teamMembers,
    weekReports,
    needsCorrectionTotal,
    openBlockers,
    trendTasks,
    statusRows,
    projectRows,
    hoursRows,
    recentVersions,
  ] = await Promise.all([
    // Everyone who is expected to file a report.
    prisma.user.findMany({
      where: { role: "TEAM_MEMBER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    // This week's reports, to work out who has filed and who has not.
    // The first version's submittedAt is when they actually filed, which is
    // what decides whether it was on time.
    prisma.report.findMany({
      where: { weekStart },
      select: {
        userId: true,
        status: true,
        versions: {
          where: { versionNumber: 1 },
          select: { submittedAt: true },
        },
      },
    }),

    prisma.report.count({ where: { status: "NEEDS_CORRECTION" } }),

    // A blocker still counts as open while its report is not approved.
    prisma.blocker.count({
      where: { report: { status: { not: "APPROVED" } } },
    }),

    // Completed tasks per week, for the trend line.
    prisma.taskItem.findMany({
      where: {
        status: "COMPLETED",
        report: { weekStart: { gte: trendStart, lte: weekStart } },
      },
      select: { report: { select: { weekStart: true } } },
    }),

    prisma.report.groupBy({
      by: ["userId", "status"],
      _count: true,
    }),

    prisma.report.findMany({
      select: {
        project: { select: { id: true, name: true } },
        hoursByType: { select: { hours: true } },
      },
    }),

    prisma.hoursByType.groupBy({
      by: ["taskType"],
      _sum: { hours: true },
    }),

    prisma.reportVersion.findMany({
      orderBy: { submittedAt: "desc" },
      take: 12,
      select: {
        id: true,
        versionNumber: true,
        submittedAt: true,
        reviewAction: true,
        reviewComment: true,
        reviewedAt: true,
        reviewer: { select: { name: true } },
        report: {
          select: {
            id: true,
            weekStart: true,
            user: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // --- Summary -------------------------------------------------------------
  // The deadline is the end of the last day of the week, so a report filed on
  // the Sunday still counts as on time.
  const deadline = new Date(weekEnd);
  deadline.setUTCDate(deadline.getUTCDate() + 1);

  const filedThisWeek = new Map(
    weekReports.map((report) => [report.userId, report])
  );

  const compliance = { ...emptyStatusCounts(), NOT_STARTED: 0 };
  let onTime = 0;
  let late = 0;

  for (const member of teamMembers) {
    const report = filedThisWeek.get(member.id);

    if (!report) {
      compliance.NOT_STARTED += 1;
      continue;
    }

    compliance[report.status] += 1;

    const firstSubmittedAt = report.versions[0]?.submittedAt;
    if (!firstSubmittedAt) continue; // still a draft - not filed at all
    if (firstSubmittedAt > deadline) late += 1;
    else onTime += 1;
  }

  const submittedThisWeek = onTime + late;
  const pending = teamMembers.length - submittedThisWeek;

  const summary = {
    teamSize: teamMembers.length,
    submittedThisWeek,
    onTime,
    late,
    pending,
    complianceRate:
      teamMembers.length === 0
        ? 0
        : Math.round((submittedThisWeek / teamMembers.length) * 100),
    needsCorrection: needsCorrectionTotal,
    openBlockers,
    compliance,
  };

  // --- Tasks completed trend ----------------------------------------------
  const trendMap = new Map<string, number>();

  for (let i = 0; i < TREND_WEEKS; i++) {
    const week = addWeeks(trendStart, i).toISOString().slice(0, 10);
    trendMap.set(week, 0);
  }

  for (const task of trendTasks) {
    const key = task.report.weekStart.toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }

  const tasksTrend = [...trendMap.entries()].map(([week, tasksCompleted]) => ({
    week,
    tasksCompleted,
  }));

  // --- Status by team member ----------------------------------------------
  const memberStatus = new Map<string, Record<ReportStatus, number>>();

  for (const member of teamMembers) {
    memberStatus.set(member.id, emptyStatusCounts());
  }

  for (const row of statusRows) {
    const counts = memberStatus.get(row.userId);
    if (counts) counts[row.status] = row._count;
  }

  const statusByMember = teamMembers.map((member) => ({
    name: member.name,
    ...(memberStatus.get(member.id) ?? emptyStatusCounts()),
  }));

  // --- Workload by project -------------------------------------------------
  const projectTotals = new Map<string, { reports: number; hours: number }>();

  for (const row of projectRows) {
    const current = projectTotals.get(row.project.name) ?? {
      reports: 0,
      hours: 0,
    };
    current.reports += 1;
    current.hours += row.hoursByType.reduce(
      (sum, entry) => sum + entry.hours,
      0
    );
    projectTotals.set(row.project.name, current);
  }

  const workloadByProject = [...projectTotals.entries()]
    .map(([project, totals]) => ({ project, ...totals }))
    .sort((a, b) => b.hours - a.hours);

  // --- Hours by task type --------------------------------------------------
  const hoursByType = hoursRows
    .map((row) => ({
      taskType: row.taskType as TaskType,
      hours: row._sum.hours ?? 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // --- Activity feed -------------------------------------------------------
  type Activity = {
    id: string;
    at: Date;
    kind: "SUBMITTED" | "APPROVED" | "REQUESTED_CHANGES";
    userName: string;
    projectName: string;
    weekStart: Date;
    reportId: string;
    versionNumber: number;
    actorName: string | null;
    comment: string | null;
  };

  const activity: Activity[] = [];

  for (const version of recentVersions) {
    activity.push({
      id: `${version.id}-submitted`,
      at: version.submittedAt,
      kind: "SUBMITTED",
      userName: version.report.user.name,
      projectName: version.report.project.name,
      weekStart: version.report.weekStart,
      reportId: version.report.id,
      versionNumber: version.versionNumber,
      actorName: version.report.user.name,
      comment: null,
    });

    if (version.reviewAction && version.reviewedAt) {
      activity.push({
        id: `${version.id}-reviewed`,
        at: version.reviewedAt,
        kind: version.reviewAction,
        userName: version.report.user.name,
        projectName: version.report.project.name,
        weekStart: version.report.weekStart,
        reportId: version.report.id,
        versionNumber: version.versionNumber,
        actorName: version.reviewer?.name ?? null,
        comment: version.reviewComment,
      });
    }
  }

  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    week: { start: weekStart, end: weekEnd },
    summary,
    tasksTrend,
    statusByMember,
    workloadByProject,
    hoursByType,
    activity: activity.slice(0, 12),
  };
}