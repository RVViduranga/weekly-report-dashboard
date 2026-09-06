"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ReportForm from "@/components/ReportForm";
import Card from "@/components/ui/Card";
import PageHeader, { BackLink } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";
import Skeleton from "@/components/ui/Skeleton";
import { formValuesFromReport, type ReportFormValues } from "@/lib/reportForm";
import type { Report, ReportVersion } from "@/types";

export default function EditReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;

  const [report, setReport] = useState<Report | null>(null);
  const [initialValues, setInitialValues] = useState<ReportFormValues | null>(
    null
  );
  const [managerComment, setManagerComment] = useState<{
    comment: string;
    reviewerName: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { report: loaded } = await api.get<{ report: Report }>(
          `/reports/${reportId}`
        );

        if (!active) return;

        setReport(loaded);
        setInitialValues(formValuesFromReport(loaded));

        if (loaded.status === "NEEDS_CORRECTION") {
          const { versions } = await api.get<{ versions: ReportVersion[] }>(
            `/reports/${reportId}/versions`
          );

          const lastReview = versions.find(
            (version) => version.reviewAction === "REQUESTED_CHANGES"
          );

          if (active && lastReview?.reviewComment) {
            setManagerComment({
              comment: lastReview.reviewComment,
              reviewerName: lastReview.reviewer?.name ?? null,
            });
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "Could not load the report"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="mt-2 h-24 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <BackLink href="/reports">Back to my reports</BackLink>
        <Notice>{error}</Notice>
      </div>
    );
  }

  if (!report || !initialValues) return null;

  const editable =
    report.status === "DRAFT" || report.status === "NEEDS_CORRECTION";

  if (!editable) {
    return (
      <div>
        <BackLink href="/reports">Back to my reports</BackLink>
        <Card className="p-6">
          <p className="text-sm">
            This report has already been submitted, so it cannot be edited right
            now.
          </p>
          <Link
            href={`/reports/${reportId}`}
            className={buttonClasses("secondary", "md", "mt-4")}
          >
            View the report
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <BackLink href={`/reports/${reportId}`}>Back to the report</BackLink>

      <PageHeader
        title="Edit weekly report"
        description={
          report.status === "NEEDS_CORRECTION"
            ? "Address the reviewer's comment, then resubmit."
            : "Keep editing your draft, then submit it when it is ready."
        }
      />

      <ReportForm
        mode="edit"
        reportId={reportId}
        initialValues={initialValues}
        managerComment={managerComment}
      />
    </div>
  );
}
