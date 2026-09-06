"use client";

import ReportForm from "@/components/ReportForm";
import PageHeader, { BackLink } from "@/components/ui/PageHeader";
import { emptyFormValues } from "@/lib/reportForm";

export default function NewReportPage() {
  return (
    <div>
      <BackLink href="/reports">Back to my reports</BackLink>

      <PageHeader
        title="New weekly report"
        description="Save it as a draft while you work on it, then submit it for review."
      />

      <ReportForm mode="create" initialValues={emptyFormValues()} />
    </div>
  );
}
