"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import type { Pagination, ReportListItem, ReportStatus } from "@/types";

interface ReportListResponse {
  reports: ReportListItem[];
  pagination: Pagination;
}

const STATUS_FILTERS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs correction" },
  { value: "APPROVED", label: "Approved" },
];

function totalHours(report: ReportListItem): number {
  return report.hoursByType.reduce((sum, entry) => sum + entry.hours, 0);
}

export default function MyReportsPage() {
  const [data, setData] = useState<ReportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | "">("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (status) params.set("status", status);

    api
      .get<ReportListResponse>(`/reports/mine?${params.toString()}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load your reports",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, status]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My reports</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every weekly report you have filed, newest first.
          </p>
        </div>

        <Link
          href="/reports/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          New report
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReportStatus | "");
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm dark:border-neutral-700"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {data && (
          <span className="text-sm text-neutral-500">
            {data.pagination.total} report
            {data.pagination.total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && (
        <p className="mt-8 text-sm text-neutral-500">Loading reports...</p>
      )}

      {error && (
        <p className="mt-8 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && data && data.reports.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            No reports here yet.{" "}
            <Link href="/reports/new" className="underline">
              Create your first one
            </Link>
            .
          </p>
        </div>
      )}

      {!loading && !error && data && data.reports.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Tasks</th>
                  <th className="px-4 py-3 text-right font-medium">Hours</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
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
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalHours(report)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/reports/${report.id}`}
                        className="underline underline-offset-2"
                      >
                        View
                      </Link>
                      {(report.status === "DRAFT" ||
                        report.status === "NEEDS_CORRECTION") && (
                        <Link
                          href={`/reports/${report.id}/edit`}
                          className="ml-3 underline underline-offset-2"
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
              >
                Previous
              </button>

              <span className="text-sm text-neutral-500">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
