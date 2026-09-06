"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import { mondayOf } from "@/lib/reportForm";
import { useRequireManager } from "@/lib/useRequireManager";
import type {
  Pagination,
  Project,
  ReportListItem,
  ReportStatus,
  User,
} from "@/types";

interface ReportListResponse {
  reports: ReportListItem[];
  pagination: Pagination;
}

interface UserRow extends User {
  _count: { reports: number };
}

const STATUS_FILTERS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs correction" },
  { value: "APPROVED", label: "Approved" },
];

const selectClass =
  "rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-700";

interface LoadedPage {
  query: string;
  data: ReportListResponse | null;
  error: string | null;
}

const NOTHING_LOADED: LoadedPage = { query: "", data: null, error: null };

export default function TeamReportsPage() {
  const { isManager } = useRequireManager();

  const [members, setMembers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedPage>(NOTHING_LOADED);

  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (userId) params.set("userId", userId);
  if (projectId) params.set("projectId", projectId);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  // Nobody has to remember to flip a loading flag: the page is loading for as
  // long as what we are holding was fetched for a different set of filters.
  const loading = loaded.query !== query;
  const { data, error } = loaded;

  useEffect(() => {
    if (!isManager) return;

    Promise.all([
      api.get<{ users: UserRow[] }>("/users"),
      api.get<{ projects: Project[] }>("/projects"),
    ])
      .then(([userData, projectData]) => {
        setMembers(userData.users);
        setProjects(projectData.projects);
      })
      .catch(() => setFilterError("Could not load the filter options"));
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;

    let active = true;

    api
      .get<ReportListResponse>(`/reports?${query}`)
      .then((result) => {
        if (active) setLoaded({ query, data: result, error: null });
      })
      .catch((err) => {
        if (active) {
          setLoaded({
            query,
            data: null,
            error:
              err instanceof ApiError ? err.message : "Could not load reports",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [isManager, query]);

  function resetFilters() {
    setUserId("");
    setProjectId("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = userId || projectId || status || from || to;

  if (!isManager) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Team reports</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every report from the whole team. Filter it down, then open one to
        review.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Team member</span>
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Everyone</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Project</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReportStatus | "");
              setPage(1);
            }}
            className={selectClass}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Weeks from</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value ? mondayOf(e.target.value) : "");
              setPage(1);
            }}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Weeks to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value ? mondayOf(e.target.value) : "");
              setPage(1);
            }}
            className={selectClass}
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {filterError && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {filterError}
        </p>
      )}

      {data && (
        <p className="mt-4 text-sm text-neutral-500">
          {data.pagination.total} report
          {data.pagination.total === 1 ? "" : "s"} match
          {data.pagination.total === 1 ? "es" : ""} these filters
        </p>
      )}

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
            No reports match these filters.
          </p>
        </div>
      )}

      {!loading && !error && data && data.reports.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Team member</th>
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Tasks</th>
                  <th className="px-4 py-3 text-right font-medium">Blockers</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${report.userId}`}
                        className="underline underline-offset-2"
                      >
                        {report.user.name}
                      </Link>
                    </td>
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
                      {report._count.blockers}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {report.status === "SUBMITTED" ? (
                        <Link
                          href={`/team/${report.id}`}
                          className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                        >
                          Review
                        </Link>
                      ) : (
                        <Link
                          href={`/reports/${report.id}`}
                          className="underline underline-offset-2"
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