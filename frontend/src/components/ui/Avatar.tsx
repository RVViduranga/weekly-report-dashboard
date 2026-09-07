const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Avatar({
  name,
  size = "md",
  tone = "neutral",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  const palette =
    tone === "accent"
      ? "bg-accent-soft text-accent-ink"
      : "bg-surface-muted text-ink-2 ring-1 ring-line";

  return (
    <span
      aria-hidden="true"
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${palette} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
