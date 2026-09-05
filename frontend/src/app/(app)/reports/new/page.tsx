"use client";

import ReportForm from "@/components/ReportForm";
import { emptyFormValues } from "@/lib/reportForm";

export default function NewReportPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">New weekly report</h1>
      <p className="mt-1 mb-8 text-sm text-neutral-500">
        Save it as a draft while you work on it, then submit it for review.
      </p>

      <ReportForm mode="create" initialValues={emptyFormValues()} />
    </div>
  );
}