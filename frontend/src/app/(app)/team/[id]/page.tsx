"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ReportDetail from "@/components/ReportDetail";
import VersionHistory from "@/components/VersionHistory";
import { useRequireManager } from "@/lib/useRequireManager";
import type { Report, ReportVersion } from "@/types";

type ReviewAction = "APPROVED" | "REQUESTED_CHANGES";

export default function ReviewReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const router = useRouter();
  const { isManager } = useRequireManager();

  const [report, setReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<ReviewAction | null>(null);

  useEffect(() => {
    if (!isManager) return;

    let active = true;

    Promise.all([
      api.get<{ report: Report }>(`/reports/${reportId}`),
      api.get<{ versions: ReportVersion[] }>(`/reports/${reportId}/versions`),
    ])
      .then(([reportData, versionData]) => {
        if (!active) return;
        setReport(reportData.report);
        setVersions(versionData.versions);
      })
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
  }, [isManager, reportId]);

  async function submitReview(action: ReviewAction) {
    setError(null);

    if (action === "REQUESTED_CHANGES" && comment.trim() === "") {
      setError("Write a comment explaining what needs to change");
      return;
    }

    setBusy(action);

    try {
      await api.post(`/reports/${reportId}/review`, {
        action,
        comment: comment.trim() === "" ? undefined : comment.trim(),
      });
      router.push("/team");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the review"
      );
      setBusy(null);
    }
  }

  if (!isManager) return null;

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading report...</p>;
  }

  if (error && !report) {
    return (
      <div>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
        <Link href="/team" className="mt-4 inline-block text-sm underline">
          Back to team reports
        </Link>
      </div>
    );
  }

  if (!report) return null;

  const awaitingReview = report.status === "SUBMITTED";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/team"
        className="self-start text-sm text-neutral-500 underline underline-offset-2"
      >
        Back to team reports
      </Link>

      <ReportDetail report={report} />

      <section className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Version history ({versions.length})
        </h2>
        <VersionHistory versions={versions} />
      </section>

      <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-base font-semibold">Your review</h2>

        {!awaitingReview ? (
          <p className="mt-2 text-sm text-neutral-500">
            This report is not waiting for review right now. Only submitted
            reports can be approved or sent back.
          </p>
        ) : (
          <>
            <p className="mt-0.5 mb-4 text-sm text-neutral-500">
              Approve it, or send it back with a comment explaining what needs
              to change.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Comment{" "}
                <span className="font-normal text-neutral-500">
                  (required when requesting changes)
                </span>
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What should this person change before resubmitting?"
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => submitReview("APPROVED")}
                disabled={busy !== null}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === "APPROVED" ? "Approving..." : "Approve"}
              </button>

              <button
                type="button"
                onClick={() => submitReview("REQUESTED_CHANGES")}
                disabled={busy !== null}
                className="rounded-md border border-amber-600 px-4 py-2 text-sm font-medium text-amber-800 disabled:opacity-50 dark:text-amber-300"
              >
                {busy === "REQUESTED_CHANGES"
                  ? "Sending back..."
                  : "Request changes"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}