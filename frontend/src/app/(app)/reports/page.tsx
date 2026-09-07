"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatWeekRange } from "@/lib/format";
import { mondayOf } from "@/lib/reportForm";
import Button, { buttonClasses } from "@/components/ui/Button";
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
import type {
  Pagination as PageInfo,
  Project,
  ReportListItem,
  ReportStatus,
} from "@/types";

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
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState<LoadedPage>(NOTHING_LOADED);

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) params.set("status", status);
  if (projectId) params.set("projectId", projectId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  // Nobody has to remember to flip a loading flag: the page is loading for as
  // long as what we are holding was fetched for a different query.
  const loading = loaded.query !== query;
  const { data, error } = loaded;

  useEffect(() => {
    api
      .get<{ projects: Project[] }>("/projects")
      .then((result) => setProjects(result.projects))
      .catch(() => {
        // The filter just stays on "all projects".
      });
  }, []);

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

  const hasFilters = Boolean(status || projectId || from || to);

  function clearFilters() {
    setStatus("");
    setProjectId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My reports</h1>
          <p className="mt-1 text-sm text-ink-2">
            Every weekly report you have filed, newest first.
          </p>
        </div>

        <Link href="/reports/new" className={buttonClasses()}>
          <Plus size={15} />
          New report
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-card">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Status</span>
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

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Project</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
            className={controlClassSm}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Weeks from</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value ? mondayOf(e.target.value) : "");
              setPage(1);
            }}
            className={controlClassSm}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Weeks to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value ? mondayOf(e.target.value) : "");
              setPage(1);
            }}
            className={controlClassSm}
          />
        </label>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        {data && (
          <span className="ml-auto self-center text-sm text-ink-3">
            <span className="font-medium text-ink-2 tabular-nums">
              {data.pagination.total}
            </span>{" "}
            report{data.pagination.total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && <SkeletonTable rows={5} columns={6} />}

      {!loading && error && <Notice>{error}</Notice>}

      {!loading && !error && data && data.reports.length === 0 && (
        <EmptyState
          icon={hasFilters ? "search" : "empty"}
          title={hasFilters ? "No reports match these filters" : "No reports yet"}
          description={
            hasFilters
              ? "Try a wider date range, or clear the filters to see everything."
              : "Your weekly reports will show up here once you file the first one."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Link href="/reports/new" className={buttonClasses()}>
                <Plus size={15} />
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
                <th className={thClass}>Updated</th>
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
                  <td className={`${tdClass} whitespace-nowrap text-ink-3`}>
                    {formatDate(report.updatedAt)}
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
