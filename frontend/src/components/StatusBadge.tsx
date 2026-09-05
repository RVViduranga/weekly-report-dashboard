import type { ReportStatus } from "@/types";

const STYLES: Record<ReportStatus, string> = {
  DRAFT:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  NEEDS_CORRECTION:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

const LABELS: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs correction",
  APPROVED: "Approved",
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}