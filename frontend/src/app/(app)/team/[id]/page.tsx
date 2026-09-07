"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import ReportDetail from "@/components/ReportDetail";
import VersionHistory from "@/components/VersionHistory";
import { useRequireManager } from "@/lib/useRequireManager";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { BackLink } from "@/components/ui/PageHeader";
import { Notice, textareaClass } from "@/components/ui/Field";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { Report, ReportVersion } from "@/types";

type ReviewAction = "APPROVED" | "REQUESTED_CHANGES";

export default function ReviewReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const router = useRouter();
  const { isManager } = useRequireManager();
  const toast = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [confirming, setConfirming] = useState<ReviewAction | null>(null);

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

  function requestReview(action: ReviewAction) {
    setError(null);

    if (action === "REQUESTED_CHANGES" && comment.trim() === "") {
      setError("Write a comment explaining what needs to change");
      return;
    }

    setConfirming(action);
  }

  async function submitReview(action: ReviewAction) {
    setBusy(action);

    try {
      await api.post(`/reports/${reportId}/review`, {
        action,
        comment: comment.trim() === "" ? undefined : comment.trim(),
      });
      toast.success(
        action === "APPROVED"
          ? `${report?.user.name}'s report was approved`
          : `Sent back to ${report?.user.name} with your comment`
      );
      router.push("/team");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the review"
      );
      setBusy(null);
      setConfirming(null);
    }
  }

  if (!isManager) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ReportDetail report={report} />
        </div>

        {/* On a wide screen the decision stays in view while the report scrolls. */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-20">
          <section
            className={`rounded-xl border bg-surface shadow-card ${
              awaitingReview ? "border-accent-line" : "border-line"
            }`}
          >
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-sm font-semibold tracking-tight">
                Your review
              </h2>
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
                    rows={4}
                    placeholder="What should this person change before resubmitting?"
                    className={textareaClass}
                  />
                </label>

                {error && (
                  <div className="mt-3">
                    <Notice>{error}</Notice>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => requestReview("APPROVED")}
                    disabled={busy !== null}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ok-ink px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Check size={15} />
                    Approve report
                  </button>

                  <button
                    type="button"
                    onClick={() => requestReview("REQUESTED_CHANGES")}
                    disabled={busy !== null}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-warn-ink/40 px-4 text-sm font-medium text-warn-ink transition-colors hover:bg-warn-soft disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Undo2 size={15} />
                    Request changes
                  </button>
                </div>
              </div>
            )}
          </section>

          <Card>
            <CardHeader
              title={`Version history (${versions.length})`}
              description="Every submission, and the decision made on it"
            />
            <div className="border-t border-line px-5 py-5">
              <VersionHistory versions={versions} />
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={confirming !== null}
        title={
          confirming === "APPROVED"
            ? `Approve ${report.user.name}'s report?`
            : `Send this back to ${report.user.name}?`
        }
        description={
          confirming === "APPROVED"
            ? "It is marked approved and locked, so nobody can edit it afterwards."
            : "They can edit and resubmit it. Your comment is attached to this version."
        }
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirming(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirming && submitReview(confirming)}
              busy={busy !== null}
              data-autofocus
            >
              {confirming === "APPROVED" ? "Approve" : "Request changes"}
            </Button>
          </>
        }
      >
        {confirming === "REQUESTED_CHANGES" && comment.trim() !== "" && (
          <blockquote className="rounded-md bg-surface-muted px-3 py-2.5 text-sm text-ink-2">
            {comment.trim()}
          </blockquote>
        )}
      </Dialog>
    </div>
  );
}
