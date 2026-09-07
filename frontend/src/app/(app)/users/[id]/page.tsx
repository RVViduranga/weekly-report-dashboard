"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import { useRequireManager } from "@/lib/useRequireManager";
import Avatar from "@/components/ui/Avatar";
import Card, { CardHeader } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import {
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui/Table";
import type { Pagination, ReportListItem, ReportStatus, User } from "@/types";

interface UserStatsResponse {
  user: User & { createdAt: string };
  stats: Record<ReportStatus, number>;
}

interface ReportListResponse {
  reports: ReportListItem[];
  pagination: Pagination;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { isManager } = useRequireManager();

  const [profile, setProfile] = useState<UserStatsResponse | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isManager) return;

    let active = true;

    Promise.all([
      api.get<UserStatsResponse>(`/users/${userId}`),
      api.get<ReportListResponse>(`/reports?userId=${userId}&pageSize=20`),
    ])
      .then(([profileData, reportData]) => {
        if (!active) return;
        setProfile(profileData);
        setReports(reportData.reports);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "Could not load this person"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isManager, userId]);

  if (!isManager) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-3.5 w-56" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-line bg-surface p-4 shadow-card"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-12" />
            </div>
          ))}
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        <BackLink href="/users">Back to team members</BackLink>
        <Notice>{error ?? "Not found"}</Notice>
      </div>
    );
  }

  const filed = Object.values(profile.stats).reduce((sum, n) => sum + n, 0);
  const approvalRate = filed === 0 ? 0 : Math.round((profile.stats.APPROVED / filed) * 100);
  const totalTasks = reports.reduce((sum, r) => sum + r._count.taskItems, 0);
  const averageTasks =
    reports.length === 0 ? 0 : Math.round((totalTasks / reports.length) * 10) / 10;

  const projectNames = [...new Set(reports.map((r) => r.project.name))];
  const isTeamMember = profile.user.role === "TEAM_MEMBER";

  return (
    <div>
      <BackLink href="/users">Back to team members</BackLink>

      <header className="flex flex-wrap items-start gap-4 pb-6">
        <Avatar name={profile.user.name} size="lg" tone="accent" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.user.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                isTeamMember
                  ? "bg-idle-soft text-idle-ink"
                  : "bg-accent-soft text-accent-ink"
              }`}
            >
              {isTeamMember ? <UserRound size={12} /> : <ShieldCheck size={12} />}
              {isTeamMember ? "Team member" : "Manager"}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
            <Mail size={14} className="text-ink-3" />
            {profile.user.email}
          </p>

          {projectNames.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {projectNames.map((project) => (
                <span
                  key={project}
                  className="rounded-md bg-surface-muted px-2 py-0.5 text-xs text-ink-2"
                >
                  {project}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Reports filed"
          value={filed}
          hint={
            profile.stats.DRAFT > 0
              ? `${profile.stats.DRAFT} still a draft`
              : "All of them submitted"
          }
        />
        <Stat
          label="Approval rate"
          value={`${approvalRate}%`}
          hint={`${profile.stats.APPROVED} of ${filed} approved`}
        />
        <Stat
          label="Awaiting review"
          value={profile.stats.SUBMITTED}
          hint={
            profile.stats.NEEDS_CORRECTION > 0
              ? `${profile.stats.NEEDS_CORRECTION} sent back for correction`
              : "Nothing sent back"
          }
        />
        <Stat
          label="Tasks per report"
          value={averageTasks}
          hint={`${totalTasks} tasks across ${reports.length} reports`}
        />
      </section>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent reports"
            description="Newest first, up to the last twenty"
          />

          {reports.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="No reports yet"
                description="Nothing has been filed by this person so far."
              />
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-sm">
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Week</th>
                    <th className={thClass}>Project</th>
                    <th className={thClass}>Status</th>
                    <th className={`${thClass} text-right`}>Tasks</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className={trClass}>
                      <td className={`${tdClass} font-medium whitespace-nowrap`}>
                        {formatWeekRange(report.weekStart, report.weekEnd)}
                      </td>
                      <td className={`${tdClass} text-ink-2`}>
                        {report.project.name}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={report.status} />
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {report._count.taskItems}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        {report.status === "SUBMITTED" ? (
                          <Link
                            href={`/team/${report.id}`}
                            className={buttonClasses("primary", "sm")}
                          >
                            Review
                          </Link>
                        ) : (
                          <Link
                            href={`/reports/${report.id}`}
                            className="font-medium text-accent-ink underline-offset-2 hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
