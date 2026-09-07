"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Pencil, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import ReportDetail from "@/components/ReportDetail";
import ReviewComment from "@/components/ReviewComment";
import VersionHistory from "@/components/VersionHistory";
import { useAuth } from "@/context/AuthContext";
import Card, { CardHeader } from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { BackLink } from "@/components/ui/PageHeader";
import { Notice } from "@/components/ui/Field";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import type { Report, ReportVersion } from "@/types";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const { user } = useAuth();
  const toast = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
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
      setConfirmSubmit(false);
      toast.success("Report submitted for review");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit the report"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-32" />
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
        <BackLink href="/reports">Back to my reports</BackLink>
        <Notice>{error}</Notice>
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
  const approval = versions.find(
    (version) => version.reviewAction === "APPROVED"
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={isManager && !isOwner ? "/team" : "/reports"}>
          {isManager && !isOwner ? "Back to team reports" : "Back to my reports"}
        </BackLink>

        <div className="mb-5 ml-auto flex flex-wrap gap-2">
          {editable && (
            <>
              <Link
                href={`/reports/${reportId}/edit`}
                className={buttonClasses("secondary")}
              >
                <Pencil size={15} />
                Edit
              </Link>
              <Button onClick={() => setConfirmSubmit(true)}>
                <Send size={15} />
                Submit for review
              </Button>
            </>
          )}

          {isManager && report.status === "SUBMITTED" && (
            <Link href={`/team/${reportId}`} className={buttonClasses()}>
              Review this report
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {report.status === "NEEDS_CORRECTION" && latestReview?.reviewComment && (
          <ReviewComment
            comment={latestReview.reviewComment}
            reviewerName={latestReview.reviewer?.name}
          />
        )}

        {report.status === "APPROVED" && approval && (
          <div className="flex items-center gap-2.5 rounded-xl border border-ok-ink/20 bg-ok-soft px-4 py-3 text-sm text-ok-ink">
            <CircleCheck size={16} className="shrink-0" />
            <span>
              Approved
              {approval.reviewer ? ` by ${approval.reviewer.name}` : ""}
              {approval.reviewedAt
                ? ` on ${formatDateTime(approval.reviewedAt)}`
                : ""}
              .
            </span>
          </div>
        )}

        {error && <Notice>{error}</Notice>}

        <ReportDetail report={report} />

        <Card>
          <CardHeader
            title={`Version history (${versions.length})`}
            description="Every submission, and the decision made on it"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHistory((open) => !open)}
                aria-expanded={showHistory}
              >
                {showHistory ? "Hide history" : "Show history"}
              </Button>
            }
          />

          {showHistory && (
            <div className="border-t border-line px-5 py-5">
              <VersionHistory versions={versions} />
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={confirmSubmit}
        title="Submit this report for review?"
        description="Your manager is notified and the report is locked until they respond. If they send it back you can edit and resubmit it."
        onClose={() => setConfirmSubmit(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmSubmit(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} busy={submitting} data-autofocus>
              Submit for review
            </Button>
          </>
        }
      />
    </div>
  );
}
