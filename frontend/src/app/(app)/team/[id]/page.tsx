"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import ReportDetail from "@/components/ReportDetail";
import VersionHistory from "@/components/VersionHistory";
import { useRequireManager } from "@/lib/useRequireManager";
import Card, { CardHeader } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/PageHeader";
import { Notice, textareaClass } from "@/components/ui/Field";
import Skeleton from "@/components/ui/Skeleton";
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
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-2 h-64 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div>
        <BackLink href="/team">Back to team reports</BackLink>
        <Notice>{error}</Notice>
      </div>
    );
  }

  if (!report) return null;

  const awaitingReview = report.status === "SUBMITTED";

  return (
    <div>
      <BackLink href="/team">Back to team reports</BackLink>

      <div className="flex flex-col gap-4">
        <ReportDetail report={report} />

        <Card>
          <CardHeader
            title={`Version history (${versions.length})`}
            description="Every submission, and the decision made on it"
          />
          <div className="border-t border-line px-5 py-5">
            <VersionHistory versions={versions} />
          </div>
        </Card>

        <section
          className={`rounded-xl border bg-surface shadow-card ${
            awaitingReview ? "border-accent-line" : "border-line"
          }`}
        >
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-sm font-semibold tracking-tight">Your review</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {awaitingReview
                ? `Approve ${report.user.name}'s report, or send it back with a comment explaining what needs to change.`
                : "This report is not waiting for review right now. Only submitted reports can be approved or sent back."}
            </p>
          </div>

          {awaitingReview && (
            <div className="border-t border-line px-5 py-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Comment{" "}
                  <span className="font-normal text-ink-3">
                    (required when requesting changes)
                  </span>
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="What should this person change before resubmitting?"
                  className={textareaClass}
                />
              </label>

              {error && (
                <div className="mt-3">
                  <Notice>{error}</Notice>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => submitReview("APPROVED")}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ok-ink px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {busy === "APPROVED" ? "Approving" : "Approve"}
                </button>

                <button
                  type="button"
                  onClick={() => submitReview("REQUESTED_CHANGES")}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-warn-ink/40 px-4 text-sm font-medium text-warn-ink transition-colors hover:bg-warn-soft disabled:pointer-events-none disabled:opacity-50"
                >
                  {busy === "REQUESTED_CHANGES"
                    ? "Sending back"
                    : "Request changes"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
