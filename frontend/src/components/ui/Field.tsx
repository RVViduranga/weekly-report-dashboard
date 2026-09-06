import type { ReactNode } from "react";

/** Every text input, select and date box in the app wears one of these. */
export const controlClass =
  "h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus:border-accent";

export const controlClassSm =
  "h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink transition-colors hover:border-ink-3 focus:border-accent";

export const textareaClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus:border-accent";

export const invalidClass = "border-danger-ink hover:border-danger-ink";

export default function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-danger-ink">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-ink-3">{hint}</span>
      )}
    </label>
  );
}

/** A non-blocking message strip. */
export function Notice({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "warn" | "info";
  children: ReactNode;
}) {
  const styles = {
    danger: "bg-danger-soft text-danger-ink",
    warn: "bg-warn-soft text-warn-ink",
    info: "bg-info-soft text-info-ink",
  }[tone];

  return (
    <p
      role="alert"
      className={`rounded-md px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}
