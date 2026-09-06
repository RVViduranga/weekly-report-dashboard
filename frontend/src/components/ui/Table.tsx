import type { ReactNode } from "react";
import Button from "./Button";

/** Wide tables scroll inside their own card rather than the page. */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export const theadClass =
  "border-b border-line bg-surface-muted text-left text-xs tracking-wide text-ink-3 uppercase";

export const thClass = "px-4 py-2.5 font-medium whitespace-nowrap";

export const trClass =
  "border-b border-line-soft transition-colors last:border-0 hover:bg-surface-muted";

export const tdClass = "px-4 py-3 align-middle";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-4"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </Button>

      <span className="text-sm text-ink-3">
        Page <span className="font-medium text-ink-2">{page}</span> of{" "}
        {totalPages}
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </nav>
  );
}
