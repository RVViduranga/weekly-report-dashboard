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
import {
  ArrowRight,
  CircleAlert,
  FileText,
  OctagonAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChartColors } from "@/lib/chartColors";
import { formatDateTime, formatWeekRange } from "@/lib/format";
import { TASK_TYPE_LABELS } from "@/lib/reportForm";
import Card, { CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";
import Skeleton from "@/components/ui/Skeleton";
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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
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

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  segments,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  segments?: Segment[];
}) {
  const total = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2 text-ink-3">
        <Icon size={14} strokeWidth={1.9} />
        <p className="text-xs font-medium tracking-wide uppercase">{label}</p>
      </div>

      <p className="mt-2.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>

      {segments && total > 0 && (
        <div
          role="img"
          aria-label={segments
            .filter((s) => s.value > 0)
            .map((s) => `${s.value} ${s.label}`)
            .join(", ")}
          className="mt-2.5 flex h-1 gap-0.5 overflow-hidden rounded-full"
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
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2.5 h-4 w-96" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-line bg-surface p-4 shadow-card"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
        <header className="pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName(user?.name ?? "")}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            You are reporting on {formatWeekRange(week.start, week.end)}. File
            this week&apos;s report, or look back at what you have submitted
            before.
          </p>
        </header>

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

  const totalReports = data.statusByMember.reduce(
    (sum, member) =>
      sum + STATUS_KEYS.reduce((count, status) => count + member[status], 0),
    0
  );

  const awaitingReview = summary.compliance.SUBMITTED;

  const standfirst =
    awaitingReview > 0
      ? `${awaitingReview} report${awaitingReview === 1 ? " is" : "s are"} waiting on your review.`
      : summary.pending > 0
        ? `${summary.pending} of ${summary.teamSize} have not filed for this week yet.`
        : "Everyone has filed for this week.";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName(user?.name ?? "")}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {standfirst} Week of{" "}
            {formatWeekRange(data.week.start, data.week.end)}.
          </p>
        </div>

        <Link href="/team" className={buttonClasses("secondary")}>
          Review reports
          <ArrowRight size={15} />
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={FileText}
          label="Total reports"
          value={totalReports}
          hint={`Filed by ${summary.teamSize} team members`}
        />
        <Kpi
          icon={TrendingUp}
          label="Submission rate"
          value={`${summary.complianceRate}%`}
          segments={[
            { label: "on time", value: summary.onTime, className: "bg-ok-ink" },
            { label: "late", value: summary.late, className: "bg-warn-ink" },
            { label: "pending", value: summary.pending, className: "bg-line" },
          ]}
          hint={[
            `${summary.onTime} on time`,
            summary.late > 0 ? `${summary.late} late` : null,
            summary.pending > 0 ? `${summary.pending} pending` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Kpi
          icon={CircleAlert}
          label="Needs correction"
          value={summary.needsCorrection}
          hint="Sent back, waiting on edits"
        />
        <Kpi
          icon={OctagonAlert}
          label="Open blockers"
          value={summary.openBlockers}
          hint="On reports not yet approved"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Submission trend"
          hint="Tasks completed across the whole team, by week"
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
          title="Team status"
          hint="Every report each member has filed so far"
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
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                // Recharts paints the label in the series colour by default.
                // The dot already carries the identity, so the words wear a
                // text colour and stay readable.
                formatter={(value) => (
                  <span style={{ color: colors.axis }}>{value}</span>
                )}
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
                  value.length > 16 ? `${value.slice(0, 15)}...` : value
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
              <Bar
                dataKey="hours"
                radius={[4, 4, 0, 0]}
                maxBarSize={64}
                isAnimationActive={false}
              >
                {data.workloadByProject.map((entry) => (
                  <Cell key={entry.project} fill={colors.line} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Time by task type"
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
                maxBarSize={28}
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

        <ul className="divide-y divide-line-soft border-t border-line">
          {data.activity.map((item) => {
            const actor =
              item.kind === "SUBMITTED" ? item.userName : (item.actorName ?? "");

            return (
              <li key={item.id} className="flex gap-3 px-5 py-3.5">
                <Avatar name={actor} size="sm" className="mt-0.5" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm">
                      <span className="font-medium">{actor}</span>{" "}
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
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
