"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ReportDetail from "@/components/ReportDetail";
import VersionHistory from "@/components/VersionHistory";
import { useAuth } from "@/context/AuthContext";
import type { Report, ReportVersion } from "@/types";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function load() {
    return Promise.all([
      api.get<{ report: Report }>(`/reports/${reportId}`),
      api.get<{ versions: ReportVersion[] }>(`/reports/${reportId}/versions`),
    ]).then(([{ report: loaded }, { versions: loadedVersions }]) => {
      setReport(loaded);
      setVersions(loadedVersions);
    });
  }

  useEffect(() => {
    let active = true;

    load()
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "Could not load the report"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/reports/${reportId}/submit`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit the report"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading report...</p>;
  }

  if (error && !report) {
    return (
      <div>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
        <Link href="/reports" className="mt-4 inline-block text-sm underline">
          Back to my reports
        </Link>
      </div>
    );
  }

  if (!report) return null;

  const isOwner = user?.id === report.userId;
  const isManager = user?.role === "MANAGER";
  const editable =
    isOwner &&
    (report.status === "DRAFT" || report.status === "NEEDS_CORRECTION");

  const latestReview = versions.find(
    (version) => version.reviewAction === "REQUESTED_CHANGES"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-500 underline underline-offset-2"
        >
          Back
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {editable && (
            <>
              <Link
                href={`/reports/${reportId}/edit`}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </>
          )}

          {isManager && report.status === "SUBMITTED" && (
            <Link
              href={`/team/${reportId}`}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Review this report
            </Link>
          )}
        </div>
      </div>

      {report.status === "NEEDS_CORRECTION" && latestReview?.reviewComment && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
          <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
            Changes requested
            {latestReview.reviewer ? ` by ${latestReview.reviewer.name}` : ""}
          </p>
          <p className="mt-1.5 text-sm text-amber-900 dark:text-amber-200">
            {latestReview.reviewComment}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <ReportDetail report={report} />

      <section className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
            Version history ({versions.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowHistory((open) => !open)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {showHistory ? "Hide history" : "Show history"}
          </button>
        </div>

        {showHistory && (
          <div className="mt-4">
            <VersionHistory versions={versions} />
          </div>
        )}
      </section>
    </div>
  );
}