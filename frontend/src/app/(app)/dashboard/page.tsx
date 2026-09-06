"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChartColors } from "@/lib/chartColors";
import { formatDateTime, formatWeekRange } from "@/lib/format";
import { TASK_TYPE_LABELS } from "@/lib/reportForm";
import Card, { CardHeader } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";
import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";
import type { ReportStatus, TaskType } from "@/types";

interface DashboardData {
  week: { start: string; end: string };
  summary: {
    teamSize: number;
    submittedThisWeek: number;
    onTime: number;
    late: number;
    pending: number;
    complianceRate: number;
    needsCorrection: number;
    openBlockers: number;
    compliance: Record<ReportStatus | "NOT_STARTED", number>;
  };
  tasksTrend: { week: string; tasksCompleted: number }[];
  statusByMember: ({ name: string } & Record<ReportStatus, number>)[];
  workloadByProject: { project: string; reports: number; hours: number }[];
  hoursByType: { taskType: TaskType; hours: number }[];
  activity: {
    id: string;
    at: string;
    kind: "SUBMITTED" | "APPROVED" | "REQUESTED_CHANGES";
    userName: string;
    projectName: string;
    weekStart: string;
    reportId: string;
    versionNumber: number;
    actorName: string | null;
    comment: string | null;
  }[];
}

const STATUS_KEYS: ReportStatus[] = [
  "APPROVED",
  "SUBMITTED",
  "NEEDS_CORRECTION",
  "DRAFT",
];

const STATUS_LABELS: Record<ReportStatus, string> = {
  APPROVED: "Approved",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs correction",
  DRAFT: "Draft",
};

const ACTIVITY_LABELS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REQUESTED_CHANGES: "sent back for correction",
};

function shortWeek(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** The Monday-to-Sunday window a member is being asked to report on. */
function currentWeek(): { start: string; end: string } {
  const now = new Date();
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return { start: monday.toISOString(), end: sunday.toISOString() };
}

interface Segment {
  label: string;
  value: number;
  className: string;
}

/**
 * A headline number with the shape of the data underneath it - a filled bar is
 * quicker to read than a second sentence.
 */
function StatTile({
  label,
  value,
  hint,
  segments,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  segments?: Segment[];
  emphasis?: boolean;
}) {
  const total = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${
          emphasis ? "text-accent-ink" : ""
        }`}
      >
        {value}
      </p>

      {segments && total > 0 && (
        <div
          role="img"
          aria-label={segments
            .filter((s) => s.value > 0)
            .map((s) => `${s.value} ${s.label}`)
            .join(", ")}
          className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
        >
          {segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <span
                key={segment.label}
                className={`h-full rounded-full ${segment.className}`}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
        </div>
      )}

      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={hint} />
      <div className="h-64 px-2 pb-4">{children}</div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="pb-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-line bg-surface p-5 shadow-card"
          >
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
            <Skeleton className="mt-5 h-52 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const colors = useChartColors();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.role === "MANAGER";

  useEffect(() => {
    if (!isManager) return;

    let active = true;

    api
      .get<DashboardData>("/dashboard")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "Could not load the dashboard"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isManager]);

  const tooltipStyle = {
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: colors.tooltipText,
  };

  if (!isManager) {
    const week = currentWeek();

    return (
      <div>
        <PageHeader
          eyebrow={`Week of ${formatWeekRange(week.start, week.end)}`}
          title={`Welcome back, ${user?.name ?? ""}`}
          description="File this week's report, or look back at what you have submitted before."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col p-5">
            <h2 className="text-sm font-semibold">This week</h2>
            <p className="mt-1 flex-1 text-sm text-ink-2">
              Start the report while the week is still fresh. Save it as a draft
              and come back to it before you submit.
            </p>
            <Link
              href="/reports/new"
              className={buttonClasses("primary", "md", "mt-5 self-start")}
            >
              Start this week&apos;s report
            </Link>
          </Card>

          <Card className="flex flex-col p-5">
            <h2 className="text-sm font-semibold">Your history</h2>
            <p className="mt-1 flex-1 text-sm text-ink-2">
              Every report you have filed, the reviewer&apos;s comments, and each
              version you sent.
            </p>
            <Link
              href="/reports"
              className={buttonClasses("secondary", "md", "mt-5 self-start")}
            >
              My reports
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return <Notice>{error ?? "No dashboard data"}</Notice>;
  }

  const { summary } = data;

  const complianceHint = [
    `${summary.onTime} on time`,
    summary.late > 0 ? `${summary.late} late` : null,
    summary.pending > 0 ? `${summary.pending} pending` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Week of ${formatWeekRange(data.week.start, data.week.end)}`}
        title="Team dashboard"
        description="How the team is tracking this week, and where the work actually went."
        actions={
          <Link href="/team" className={buttonClasses("secondary")}>
            Review reports
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Submitted this week"
          value={`${summary.submittedThisWeek} / ${summary.teamSize}`}
          segments={[
            {
              label: "filed",
              value: summary.submittedThisWeek,
              className: "bg-accent",
            },
            { label: "not filed", value: summary.pending, className: "bg-line" },
          ]}
          hint={
            summary.pending > 0
              ? `${summary.pending} still pending`
              : "Everyone has filed"
          }
        />
        <StatTile
          label="Compliance rate"
          value={`${summary.complianceRate}%`}
          emphasis
          segments={[
            { label: "on time", value: summary.onTime, className: "bg-ok-ink" },
            { label: "late", value: summary.late, className: "bg-warn-ink" },
            { label: "pending", value: summary.pending, className: "bg-line" },
          ]}
          hint={complianceHint}
        />
        <StatTile
          label="Needs correction"
          value={summary.needsCorrection}
          hint="Sent back, waiting on edits"
        />
        <StatTile
          label="Open blockers"
          value={summary.openBlockers}
          hint="On reports not yet approved"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Tasks completed"
          hint="Across the whole team, by week"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.tasksTrend}
              margin={{ top: 8, right: 12, bottom: 4, left: -20 }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={shortWeek}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => `Week of ${shortWeek(String(value))}`}
                formatter={(value) => [String(value), "Tasks completed"]}
              />
              <Line
                type="monotone"
                dataKey="tasksCompleted"
                stroke={colors.line}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.line, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Report status by team member"
          hint="Every report they have filed so far"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.statusByMember}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 4, left: 40 }}
            >
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => value.split(" ")[0]}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: colors.axis }}
                iconType="circle"
              />
              {STATUS_KEYS.map((status) => (
                <Bar
                  key={status}
                  dataKey={status}
                  name={STATUS_LABELS[status]}
                  stackId="reports"
                  fill={colors[status]}
                  radius={2}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Workload by project"
          hint="Total hours recorded against each project"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.workloadByProject}
              margin={{ top: 8, right: 12, bottom: 4, left: -20 }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="project"
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 13)}...` : value
                }
              />
              <YAxis
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={false}
                formatter={(value) => [`${value} hrs`, "Hours"]}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.workloadByProject.map((entry) => (
                  <Cell key={entry.project} fill={colors.line} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Time spent by task type"
          hint="Where the team's hours actually went"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.hoursByType}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 4, left: 40 }}
            >
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                type="category"
                dataKey="taskType"
                width={100}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: TaskType) => TASK_TYPE_LABELS[value]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={false}
                labelFormatter={(label) => TASK_TYPE_LABELS[label as TaskType]}
                formatter={(value) => [`${value} hrs`, "Hours"]}
              />
              <Bar
                dataKey="hours"
                fill={colors.line}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Submissions and review decisions, newest first"
        />

        <ol className="px-5 pb-5">
          {data.activity.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
              {index < data.activity.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-4 bottom-0 left-[3.5px] w-px bg-line"
                />
              )}

              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-surface"
                style={{
                  backgroundColor:
                    item.kind === "APPROVED"
                      ? colors.APPROVED
                      : item.kind === "REQUESTED_CHANGES"
                        ? colors.NEEDS_CORRECTION
                        : colors.SUBMITTED,
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-sm">
                    <span className="font-medium">
                      {item.kind === "SUBMITTED" ? item.userName : item.actorName}
                    </span>{" "}
                    {ACTIVITY_LABELS[item.kind]}{" "}
                    {item.kind !== "SUBMITTED" && (
                      <>
                        <span className="font-medium">{item.userName}</span>
                        &apos;s{" "}
                      </>
                    )}
                    <Link
                      href={`/reports/${item.reportId}`}
                      className="font-medium text-accent-ink underline-offset-2 hover:underline"
                    >
                      {shortWeek(item.weekStart.slice(0, 10))} report
                    </Link>
                  </p>
                  <span className="ml-auto text-xs whitespace-nowrap text-ink-3">
                    {formatDateTime(item.at)}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-ink-3">
                  {item.projectName} · version {item.versionNumber}
                </p>

                {item.comment && (
                  <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-2">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
