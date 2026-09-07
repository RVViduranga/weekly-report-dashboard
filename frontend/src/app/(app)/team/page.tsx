"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import { mondayOf } from "@/lib/reportForm";
import { useRequireManager } from "@/lib/useRequireManager";
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
  User,
} from "@/types";

interface ReportListResponse {
  reports: ReportListItem[];
  pagination: PageInfo;
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
      <header className="pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Team reports</h1>
        <p className="mt-1 text-sm text-ink-2">
          Every report from the whole team. Filter it down, then open one to
          review.
        </p>
      </header>

      <div className="mb-4 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-3">Team member</span>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              className={controlClassSm}
            >
              <option value="">Everyone</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
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
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          )}

          {data && (
            <span className="ml-auto self-center text-sm text-ink-3">
              <span className="font-medium text-ink-2 tabular-nums">
                {data.pagination.total}
              </span>{" "}
              report{data.pagination.total === 1 ? "" : "s"} match
              {data.pagination.total === 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {filterError && (
        <div className="mb-4">
          <Notice tone="warn">{filterError}</Notice>
        </div>
      )}

      {loading && <SkeletonTable rows={8} columns={6} />}

      {!loading && error && <Notice>{error}</Notice>}

      {!loading && !error && data && data.reports.length === 0 && (
        <EmptyState
          icon="search"
          title="No reports match these filters"
          description="Widen the date range or clear a filter to see more."
          action={
            hasFilters && (
              <Button variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            )
          }
        />
      )}

      {!loading && !error && data && data.reports.length > 0 && (
        <>
          <TableShell>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Team member</th>
                <th className={thClass}>Week</th>
                <th className={thClass}>Project</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Tasks</th>
                <th className={`${thClass} text-right`}>Blockers</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {data.reports.map((report) => (
                <tr key={report.id} className={trClass}>
                  <td className={tdClass}>
                    <Link
                      href={`/users/${report.userId}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {report.user.name}
                    </Link>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-ink-2`}>
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
                    {report._count.blockers}
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
