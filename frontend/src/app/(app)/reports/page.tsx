"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { controlClassSm, Notice } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  Pagination,
  TableShell,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui/Table";
import type { Pagination as PageInfo, ReportListItem, ReportStatus } from "@/types";

interface ReportListResponse {
  reports: ReportListItem[];
  pagination: PageInfo;
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

interface LoadedPage {
  query: string;
  data: ReportListResponse | null;
  error: string | null;
}

const NOTHING_LOADED: LoadedPage = { query: "", data: null, error: null };

export default function MyReportsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [loaded, setLoaded] = useState<LoadedPage>(NOTHING_LOADED);

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) params.set("status", status);
  const query = params.toString();

  // Nobody has to remember to flip a loading flag: the page is loading for as
  // long as what we are holding was fetched for a different query.
  const loading = loaded.query !== query;
  const { data, error } = loaded;

  useEffect(() => {
    let active = true;

    api
      .get<ReportListResponse>(`/reports/mine?${query}`)
      .then((result) => {
        if (active) setLoaded({ query, data: result, error: null });
      })
      .catch((err) => {
        if (active) {
          setLoaded({
            query,
            data: null,
            error:
              err instanceof ApiError
                ? err.message
                : "Could not load your reports",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div>
      <PageHeader
        title="My reports"
        description="Every weekly report you have filed, newest first."
        actions={
          <Link href="/reports/new" className={buttonClasses()}>
            New report
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-3">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReportStatus | "");
              setPage(1);
            }}
            className={controlClassSm}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {data && (
          <span className="text-sm text-ink-3">
            {data.pagination.total} report
            {data.pagination.total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && <SkeletonTable rows={5} columns={5} />}

      {!loading && error && <Notice>{error}</Notice>}

      {!loading && !error && data && data.reports.length === 0 && (
        <EmptyState
          title={
            status ? "No reports with that status" : "No reports here yet"
          }
          description={
            status
              ? "Try a different status, or clear the filter to see everything."
              : "Your weekly reports will show up here once you file the first one."
          }
          icon={status ? "search" : "empty"}
          action={
            !status && (
              <Link href="/reports/new" className={buttonClasses()}>
                Create your first report
              </Link>
            )
          }
        />
      )}

      {!loading && !error && data && data.reports.length > 0 && (
        <>
          <TableShell>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Week</th>
                <th className={thClass}>Project</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Tasks</th>
                <th className={`${thClass} text-right`}>Hours</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {data.reports.map((report) => (
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
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {totalHours(report)}
                  </td>
                  <td className={`${tdClass} text-right whitespace-nowrap`}>
                    <Link
                      href={`/reports/${report.id}`}
                      className="font-medium text-accent-ink underline-offset-2 hover:underline"
                    >
                      View
                    </Link>
                    {(report.status === "DRAFT" ||
                      report.status === "NEEDS_CORRECTION") && (
                      <Link
                        href={`/reports/${report.id}/edit`}
                        className="ml-4 font-medium text-accent-ink underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
