import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
  icon = "empty",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: "empty" | "search" | "check";
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Glyph name={icon} />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function Glyph({ name }: { name: "empty" | "search" | "check" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13 13 4 4" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m4 10.5 4 4 8-9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4.5 6.5h11v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
      <path d="M7.5 3.5h5v3h-5z" />
      <path d="M8 11h4" />
    </svg>
  );
}
