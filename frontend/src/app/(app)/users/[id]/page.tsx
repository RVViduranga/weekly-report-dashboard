"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import { useRequireManager } from "@/lib/useRequireManager";
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
    return <p className="text-sm text-neutral-500">Loading profile...</p>;
  }

  if (error || !profile) {
    return (
      <div>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error ?? "Not found"}
        </p>
        <Link href="/users" className="mt-4 inline-block text-sm underline">
          Back to team members
        </Link>
      </div>
    );
  }

  const totalReports = Object.values(profile.stats).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/users"
        className="self-start text-sm text-neutral-500 underline underline-offset-2"
      >
        Back to team members
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{profile.user.name}</h1>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-neutral-600 uppercase dark:bg-neutral-800 dark:text-neutral-400">
            {profile.user.role === "MANAGER" ? "Manager" : "Team member"}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{profile.user.email}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_ORDER.map((stat) => (
          <div
            key={stat.key}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-xs text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {profile.stats[stat.key]}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Report history ({totalReports})
        </h2>

        {reports.length === 0 ? (
          <p className="text-sm text-neutral-500">
            This person has not filed any reports yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Tasks</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatWeekRange(report.weekStart, report.weekEnd)}
                    </td>
                    <td className="px-4 py-3">{report.project.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {report._count.taskItems}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={
                          report.status === "SUBMITTED"
                            ? `/team/${report.id}`
                            : `/reports/${report.id}`
                        }
                        className="underline underline-offset-2"
                      >
                        {report.status === "SUBMITTED" ? "Review" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}