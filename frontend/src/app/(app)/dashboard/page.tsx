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

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
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
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-4 h-64">{children}</div>
    </section>
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
    if (!isManager) {
      setLoading(false);
      return;
    }

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
    return (
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          File this week&apos;s report, or look back at what you have submitted
          before.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reports/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Start this week&apos;s report
          </Link>
          <Link
            href="/reports"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          >
            My reports
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading dashboard...</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        {error ?? "No dashboard data"}
      </p>
    );
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
      <header>
        <h1 className="text-2xl font-semibold">Team dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Week of {formatWeekRange(data.week.start, data.week.end)}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Submitted this week"
          value={`${summary.submittedThisWeek} / ${summary.teamSize}`}
          hint={
            summary.pending > 0
              ? `${summary.pending} still pending`
              : "Everyone has filed"
          }
        />
        <StatTile
          label="Compliance rate"
          value={`${summary.complianceRate}%`}
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

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          Submissions and review decisions, newest first
        </p>

        <ul className="mt-4 flex flex-col gap-3">
          {data.activity.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-neutral-200 pt-3 text-sm first:border-0 first:pt-0 dark:border-neutral-800"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 self-center rounded-full"
                style={{
                  backgroundColor:
                    item.kind === "APPROVED"
                      ? colors.APPROVED
                      : item.kind === "REQUESTED_CHANGES"
                        ? colors.NEEDS_CORRECTION
                        : colors.SUBMITTED,
                }}
              />
              <span>
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
                  className="underline underline-offset-2"
                >
                  {shortWeek(item.weekStart.slice(0, 10))} report
                </Link>{" "}
                <span className="text-neutral-500">
                  ({item.projectName}, v{item.versionNumber})
                </span>
              </span>
              <span className="ml-auto text-xs whitespace-nowrap text-neutral-500">
                {formatDateTime(item.at)}
              </span>
              {item.comment && (
                <p className="w-full text-xs text-neutral-500">
                  &ldquo;{item.comment}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}