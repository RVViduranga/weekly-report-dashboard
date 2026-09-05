"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ReportForm from "@/components/ReportForm";
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
    return <p className="text-sm text-neutral-500">Loading report...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!report || !initialValues) return null;

  const editable =
    report.status === "DRAFT" || report.status === "NEEDS_CORRECTION";

  if (!editable) {
    return (
      <div className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <p className="text-sm">
          This report has already been submitted, so it cannot be edited right
          now.
        </p>
        <Link
          href={`/reports/${reportId}`}
          className="mt-3 inline-block text-sm underline"
        >
          View the report
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit weekly report</h1>
      <p className="mt-1 mb-8 text-sm text-neutral-500">
        {report.status === "NEEDS_CORRECTION"
          ? "Address the reviewer's comment, then resubmit."
          : "Keep editing your draft, then submit it when it is ready."}
      </p>

      <ReportForm
        mode="edit"
        reportId={reportId}
        initialValues={initialValues}
        managerComment={managerComment}
      />
    </div>
  );
}