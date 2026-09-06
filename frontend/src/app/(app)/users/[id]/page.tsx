"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import { useRequireManager } from "@/lib/useRequireManager";
import { BackLink } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton, { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import {
  TableShell,
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

const STAT_ORDER: { key: ReportStatus; label: string }[] = [
  { key: "APPROVED", label: "Approved" },
  { key: "SUBMITTED", label: "Awaiting review" },
  { key: "NEEDS_CORRECTION", label: "Needs correction" },
  { key: "DRAFT", label: "Draft" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
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

  const totalReports = Object.values(profile.stats).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div>
      <BackLink href="/users">Back to team members</BackLink>

      <header className="flex items-center gap-4 pb-6">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink"
        >
          {initials(profile.user.name)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.user.name}
            </h1>
            <span className="rounded-full bg-idle-soft px-2 py-0.5 text-[11px] font-medium tracking-wide text-idle-ink uppercase">
              {profile.user.role === "MANAGER" ? "Manager" : "Team member"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-2">{profile.user.email}</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_ORDER.map((stat) => (
          <div
            key={stat.key}
            className="rounded-xl border border-line bg-surface p-4 shadow-card"
          >
            <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {profile.stats[stat.key]}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">
          Report history{" "}
          <span className="font-normal text-ink-3">({totalReports})</span>
        </h2>

        {reports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="Nothing has been filed by this person so far."
          />
        ) : (
          <TableShell>
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
          </TableShell>
        )}
      </section>
    </div>
  );
}
