import type { ReportStatus } from "@/types";

const STYLES: Record<ReportStatus, string> = {
  DRAFT: "bg-idle-soft text-idle-ink",
  SUBMITTED: "bg-info-soft text-info-ink",
  NEEDS_CORRECTION: "bg-warn-soft text-warn-ink",
  APPROVED: "bg-ok-soft text-ok-ink",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {LABELS[status]}
    </span>
  );
}
